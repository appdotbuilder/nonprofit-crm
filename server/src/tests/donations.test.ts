import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { donorsTable, campaignsTable, donationsTable } from '../db/schema';
import { type CreateDonationInput, type UpdateDonationInput, type FilterInput } from '../schema';
import {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  getDonationsByDonor,
  getDonationsByCampaign
} from '../handlers/donations';
import { eq, and } from 'drizzle-orm';

const testTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const otherTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';

const testDonorInput = {
  tenantId: testTenantId,
  name: 'John Donor',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  notes: 'Test donor',
  customFields: null
};

const testCampaignInput = {
  tenantId: testTenantId,
  name: 'Test Campaign',
  description: 'A test campaign',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  goalAmount: 10000,
  status: 'Active' as const,
  customFields: null
};

const testDonationInput: CreateDonationInput = {
  tenantId: testTenantId,
  donorId: 1, // Will be set after donor creation
  campaignId: null,
  amount: 100.50,
  date: new Date('2024-01-15'),
  status: 'Received',
  paymentMethod: 'Credit Card',
  notes: 'Test donation',
  customFields: { source: 'website' }
};

describe('donations handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let donorId: number;
  let campaignId: number;

  beforeEach(async () => {
    // Create test donor
    const donorResult = await db.insert(donorsTable)
      .values(testDonorInput)
      .returning()
      .execute();
    donorId = donorResult[0].id;

    // Create test campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        ...testCampaignInput,
        goalAmount: testCampaignInput.goalAmount.toString(),
        currentAmountRaised: '0'
      })
      .returning()
      .execute();
    campaignId = campaignResult[0].id;

    testDonationInput.donorId = donorId;
  });

  describe('createDonation', () => {
    it('should create a donation successfully', async () => {
      const result = await createDonation(testDonationInput);

      expect(result.id).toBeDefined();
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.donorId).toEqual(donorId);
      expect(result.amount).toEqual(100.50);
      expect(result.status).toEqual('Received');
      expect(result.paymentMethod).toEqual('Credit Card');
      expect(result.notes).toEqual('Test donation');
      expect(result.customFields).toEqual({ source: 'website' });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create donation and update campaign amount when linked', async () => {
      const input = { ...testDonationInput, campaignId };

      const result = await createDonation(input);

      expect(result.campaignId).toEqual(campaignId);

      // Check campaign amount was updated
      const campaigns = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .execute();

      expect(parseFloat(campaigns[0].currentAmountRaised)).toEqual(100.50);
    });

    it('should not update campaign amount for non-received donations', async () => {
      const input = {
        ...testDonationInput,
        campaignId,
        status: 'Pledged' as const
      };

      await createDonation(input);

      // Check campaign amount was not updated
      const campaigns = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .execute();

      expect(parseFloat(campaigns[0].currentAmountRaised)).toEqual(0);
    });

    it('should reject creation with non-existent donor', async () => {
      const input = { ...testDonationInput, donorId: 999 };

      expect(createDonation(input)).rejects.toThrow(/donor not found/i);
    });

    it('should reject creation with donor from different tenant', async () => {
      // Create donor in different tenant
      const otherDonor = await db.insert(donorsTable)
        .values({ ...testDonorInput, tenantId: otherTenantId })
        .returning()
        .execute();

      const input = { ...testDonationInput, donorId: otherDonor[0].id };

      expect(createDonation(input)).rejects.toThrow(/donor not found/i);
    });

    it('should reject creation with non-existent campaign', async () => {
      const input = { ...testDonationInput, campaignId: 999 };

      expect(createDonation(input)).rejects.toThrow(/campaign not found/i);
    });

    it('should reject creation with campaign from different tenant', async () => {
      // Create campaign in different tenant
      const otherCampaign = await db.insert(campaignsTable)
        .values({
          ...testCampaignInput,
          tenantId: otherTenantId,
          goalAmount: testCampaignInput.goalAmount.toString(),
          currentAmountRaised: '0'
        })
        .returning()
        .execute();

      const input = { ...testDonationInput, campaignId: otherCampaign[0].id };

      expect(createDonation(input)).rejects.toThrow(/campaign not found/i);
    });
  });

  describe('getDonations', () => {
    beforeEach(async () => {
      // Create multiple donations for testing
      await createDonation(testDonationInput);
      await createDonation({
        ...testDonationInput,
        amount: 250.75,
        status: 'Pledged',
        paymentMethod: 'Cash'
      });
    });

    it('should get donations with pagination', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getDonations(filter);

      expect(result.donations).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(typeof result.donations[0].amount).toEqual('number');
    });

    it('should filter donations by search term', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
        search: 'John'
      };

      const result = await getDonations(filter);

      expect(result.donations).toHaveLength(2); // Both donations from John Donor
      expect(result.total).toEqual(2);
    });

    it('should respect tenant isolation', async () => {
      const filter: FilterInput = {
        tenantId: otherTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getDonations(filter);

      expect(result.donations).toHaveLength(0);
      expect(result.total).toEqual(0);
    });

    it('should handle pagination correctly', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 1,
        sortOrder: 'desc'
      };

      const result = await getDonations(filter);

      expect(result.donations).toHaveLength(1);
      expect(result.total).toEqual(2);
    });

    it('should sort donations correctly', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortBy: 'amount',
        sortOrder: 'asc'
      };

      const result = await getDonations(filter);

      expect(result.donations[0].amount).toBeLessThan(result.donations[1].amount);
    });
  });

  describe('getDonationById', () => {
    let donationId: number;

    beforeEach(async () => {
      const donation = await createDonation(testDonationInput);
      donationId = donation.id;
    });

    it('should get donation by ID', async () => {
      const result = await getDonationById(donationId, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(donationId);
      expect(typeof result!.amount).toEqual('number');
      expect(result!.amount).toEqual(100.50);
    });

    it('should return null for non-existent donation', async () => {
      const result = await getDonationById(999, testTenantId);

      expect(result).toBeNull();
    });

    it('should respect tenant isolation', async () => {
      const result = await getDonationById(donationId, otherTenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateDonation', () => {
    let donationId: number;

    beforeEach(async () => {
      const donation = await createDonation({
        ...testDonationInput,
        campaignId,
        status: 'Received'
      });
      donationId = donation.id;
    });

    it('should update donation successfully', async () => {
      const updateInput: UpdateDonationInput = {
        id: donationId,
        amount: 150.25,
        notes: 'Updated donation'
      };

      const result = await updateDonation(updateInput, testTenantId);

      expect(result.id).toEqual(donationId);
      expect(result.amount).toEqual(150.25);
      expect(result.notes).toEqual('Updated donation');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should update campaign amount when donation amount changes', async () => {
      const updateInput: UpdateDonationInput = {
        id: donationId,
        amount: 200.00
      };

      await updateDonation(updateInput, testTenantId);

      // Check campaign amount was updated (old amount removed, new amount added)
      const campaigns = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .execute();

      expect(parseFloat(campaigns[0].currentAmountRaised)).toEqual(200.00);
    });

    it('should handle campaign changes correctly', async () => {
      // Create another campaign
      const newCampaign = await db.insert(campaignsTable)
        .values({
          ...testCampaignInput,
          name: 'New Campaign',
          goalAmount: '5000',
          currentAmountRaised: '0'
        })
        .returning()
        .execute();

      const updateInput: UpdateDonationInput = {
        id: donationId,
        campaignId: newCampaign[0].id
      };

      await updateDonation(updateInput, testTenantId);

      // Check old campaign amount was reduced
      const oldCampaign = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .execute();
      expect(parseFloat(oldCampaign[0].currentAmountRaised)).toEqual(0);

      // Check new campaign amount was increased
      const campaigns = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, newCampaign[0].id))
        .execute();
      expect(parseFloat(campaigns[0].currentAmountRaised)).toEqual(100.50);
    });

    it('should reject update of non-existent donation', async () => {
      const updateInput: UpdateDonationInput = {
        id: 999,
        amount: 150.25
      };

      expect(updateDonation(updateInput, testTenantId)).rejects.toThrow(/donation not found/i);
    });

    it('should respect tenant isolation', async () => {
      const updateInput: UpdateDonationInput = {
        id: donationId,
        amount: 150.25
      };

      expect(updateDonation(updateInput, otherTenantId)).rejects.toThrow(/donation not found/i);
    });
  });

  describe('deleteDonation', () => {
    let donationId: number;

    beforeEach(async () => {
      const donation = await createDonation({
        ...testDonationInput,
        campaignId,
        status: 'Received'
      });
      donationId = donation.id;
    });

    it('should delete donation successfully', async () => {
      await deleteDonation(donationId, testTenantId);

      const result = await getDonationById(donationId, testTenantId);
      expect(result).toBeNull();
    });

    it('should update campaign amount when deleting received donation', async () => {
      await deleteDonation(donationId, testTenantId);

      // Check campaign amount was reduced
      const campaigns = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .execute();

      expect(parseFloat(campaigns[0].currentAmountRaised)).toEqual(0);
    });

    it('should reject deletion of non-existent donation', async () => {
      expect(deleteDonation(999, testTenantId)).rejects.toThrow(/donation not found/i);
    });

    it('should respect tenant isolation', async () => {
      expect(deleteDonation(donationId, otherTenantId)).rejects.toThrow(/donation not found/i);
    });
  });

  describe('getDonationsByDonor', () => {
    beforeEach(async () => {
      await createDonation(testDonationInput);
      await createDonation({
        ...testDonationInput,
        amount: 250.00,
        status: 'Pledged'
      });
    });

    it('should get donations by donor', async () => {
      const result = await getDonationsByDonor(donorId, testTenantId);

      expect(result).toHaveLength(2);
      expect(result.every(d => d.donorId === donorId)).toBe(true);
      expect(result.every(d => typeof d.amount === 'number')).toBe(true);
    });

    it('should reject request for non-existent donor', async () => {
      expect(getDonationsByDonor(999, testTenantId)).rejects.toThrow(/donor not found/i);
    });

    it('should respect tenant isolation', async () => {
      expect(getDonationsByDonor(donorId, otherTenantId)).rejects.toThrow(/donor not found/i);
    });
  });

  describe('getDonationsByCampaign', () => {
    beforeEach(async () => {
      await createDonation({
        ...testDonationInput,
        campaignId
      });
      await createDonation({
        ...testDonationInput,
        campaignId,
        amount: 300.00
      });
    });

    it('should get donations by campaign', async () => {
      const result = await getDonationsByCampaign(campaignId, testTenantId);

      expect(result).toHaveLength(2);
      expect(result.every(d => d.campaignId === campaignId)).toBe(true);
      expect(result.every(d => typeof d.amount === 'number')).toBe(true);
    });

    it('should reject request for non-existent campaign', async () => {
      expect(getDonationsByCampaign(999, testTenantId)).rejects.toThrow(/campaign not found/i);
    });

    it('should respect tenant isolation', async () => {
      expect(getDonationsByCampaign(campaignId, otherTenantId)).rejects.toThrow(/campaign not found/i);
    });
  });

  describe('numeric conversion handling', () => {
    it('should properly convert numeric amounts in all operations', async () => {
      // Test create
      const created = await createDonation({ ...testDonationInput, amount: 99.99 });
      expect(typeof created.amount).toEqual('number');
      expect(created.amount).toEqual(99.99);

      // Test get by ID
      const fetched = await getDonationById(created.id, testTenantId);
      expect(typeof fetched!.amount).toEqual('number');
      expect(fetched!.amount).toEqual(99.99);

      // Test update
      const updated = await updateDonation(
        { id: created.id, amount: 199.99 },
        testTenantId
      );
      expect(typeof updated.amount).toEqual('number');
      expect(updated.amount).toEqual(199.99);

      // Test get donations
      const { donations } = await getDonations({
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      });
      expect(donations.every(d => typeof d.amount === 'number')).toBe(true);
    });
  });
});