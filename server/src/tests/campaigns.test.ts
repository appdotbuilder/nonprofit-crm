import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreateCampaignInput, type UpdateCampaignInput, type FilterInput } from '../schema';
import { 
  createCampaign, 
  getCampaigns, 
  getCampaignById, 
  updateCampaign, 
  deleteCampaign 
} from '../handlers/campaigns';

const testTenantId = '123e4567-e89b-12d3-a456-426614174000';
const otherTenantId = '123e4567-e89b-12d3-a456-426614174001';

const testCampaignInput: CreateCampaignInput = {
  tenantId: testTenantId,
  name: 'Test Campaign',
  description: 'A campaign for testing',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  goalAmount: 50000,
  status: 'Active',
  customFields: { priority: 'high', tags: ['fundraising', 'annual'] },
};

describe('Campaign Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      const result = await createCampaign(testCampaignInput);

      expect(result.id).toBeDefined();
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.name).toEqual('Test Campaign');
      expect(result.description).toEqual('A campaign for testing');
      expect(result.startDate).toEqual(new Date('2024-01-01'));
      expect(result.endDate).toEqual(new Date('2024-12-31'));
      expect(result.goalAmount).toEqual(50000);
      expect(typeof result.goalAmount).toBe('number');
      expect(result.currentAmountRaised).toEqual(0);
      expect(typeof result.currentAmountRaised).toBe('number');
      expect(result.status).toEqual('Active');
      expect(result.customFields).toEqual({ priority: 'high', tags: ['fundraising', 'annual'] });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a campaign with minimal data', async () => {
      const minimalInput: CreateCampaignInput = {
        tenantId: testTenantId,
        name: 'Minimal Campaign',
        description: null,
        startDate: null,
        endDate: null,
        goalAmount: 10000,
        status: 'Planned',
        customFields: null,
      };

      const result = await createCampaign(minimalInput);

      expect(result.name).toEqual('Minimal Campaign');
      expect(result.description).toBeNull();
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.goalAmount).toEqual(10000);
      expect(result.status).toEqual('Planned');
      expect(result.customFields).toBeNull();
    });

    it('should handle campaigns with different statuses', async () => {
      const statuses = ['Active', 'Completed', 'Cancelled', 'Planned'] as const;
      
      for (const status of statuses) {
        const input: CreateCampaignInput = {
          ...testCampaignInput,
          name: `Campaign ${status}`,
          status,
        };
        
        const result = await createCampaign(input);
        expect(result.status).toEqual(status);
      }
    });
  });

  describe('getCampaigns', () => {
    beforeEach(async () => {
      // Create test campaigns
      await createCampaign({
        ...testCampaignInput,
        name: 'Campaign 1',
        goalAmount: 10000,
        status: 'Active',
      });
      await createCampaign({
        ...testCampaignInput,
        name: 'Campaign 2',
        goalAmount: 20000,
        status: 'Completed',
      });
      await createCampaign({
        ...testCampaignInput,
        name: 'Different Name',
        goalAmount: 30000,
        status: 'Cancelled',
      });
      // Create campaign for different tenant
      await createCampaign({
        ...testCampaignInput,
        tenantId: otherTenantId,
        name: 'Other Tenant Campaign',
      });
    });

    it('should get campaigns with pagination', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 2,
        sortOrder: 'desc',
      };

      const result = await getCampaigns(filter);

      expect(result.campaigns).toHaveLength(2);
      expect(result.total).toEqual(3);
      expect(result.campaigns[0].tenantId).toEqual(testTenantId);
      expect(result.campaigns[1].tenantId).toEqual(testTenantId);
      
      // Verify numeric conversion
      result.campaigns.forEach(campaign => {
        expect(typeof campaign.goalAmount).toBe('number');
        expect(typeof campaign.currentAmountRaised).toBe('number');
      });
    });

    it('should filter campaigns by search term', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        search: 'Campaign',
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getCampaigns(filter);

      expect(result.campaigns).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(result.campaigns.every(c => c.name.includes('Campaign'))).toBe(true);
    });

    it('should sort campaigns by name ascending', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      const result = await getCampaigns(filter);

      expect(result.campaigns).toHaveLength(3);
      expect(result.campaigns[0].name).toEqual('Campaign 1');
      expect(result.campaigns[1].name).toEqual('Campaign 2');
      expect(result.campaigns[2].name).toEqual('Different Name');
    });

    it('should enforce tenant isolation', async () => {
      const filter: FilterInput = {
        tenantId: otherTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getCampaigns(filter);

      expect(result.campaigns).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.campaigns[0].name).toEqual('Other Tenant Campaign');
      expect(result.campaigns[0].tenantId).toEqual(otherTenantId);
    });

    it('should handle empty results', async () => {
      const nonExistentTenantId = '123e4567-e89b-12d3-a456-426614174999';
      const filter: FilterInput = {
        tenantId: nonExistentTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getCampaigns(filter);

      expect(result.campaigns).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('getCampaignById', () => {
    it('should get a campaign by ID', async () => {
      const created = await createCampaign(testCampaignInput);
      const result = await getCampaignById(created.id, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Campaign');
      expect(result!.tenantId).toEqual(testTenantId);
      expect(typeof result!.goalAmount).toBe('number');
      expect(typeof result!.currentAmountRaised).toBe('number');
    });

    it('should return null for non-existent campaign', async () => {
      const result = await getCampaignById(9999, testTenantId);
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      const created = await createCampaign(testCampaignInput);
      const result = await getCampaignById(created.id, otherTenantId);
      expect(result).toBeNull();
    });
  });

  describe('updateCampaign', () => {
    it('should update a campaign successfully', async () => {
      const created = await createCampaign(testCampaignInput);
      
      const updateInput: UpdateCampaignInput = {
        id: created.id,
        name: 'Updated Campaign Name',
        goalAmount: 75000,
        status: 'Completed',
        customFields: { priority: 'low', updated: true },
      };

      const result = await updateCampaign(updateInput, testTenantId);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Campaign Name');
      expect(result.goalAmount).toEqual(75000);
      expect(typeof result.goalAmount).toBe('number');
      expect(result.status).toEqual('Completed');
      expect(result.customFields).toEqual({ priority: 'low', updated: true });
      expect(result.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      
      // Verify unchanged fields
      expect(result.description).toEqual(created.description);
      expect(result.startDate).toEqual(created.startDate);
    });

    it('should update partial fields', async () => {
      const created = await createCampaign(testCampaignInput);
      
      const updateInput: UpdateCampaignInput = {
        id: created.id,
        description: 'Updated description only',
      };

      const result = await updateCampaign(updateInput, testTenantId);

      expect(result.description).toEqual('Updated description only');
      expect(result.name).toEqual(created.name); // Unchanged
      expect(result.goalAmount).toEqual(created.goalAmount); // Unchanged
    });

    it('should update currentAmountRaised', async () => {
      const created = await createCampaign(testCampaignInput);
      
      const updateInput: UpdateCampaignInput = {
        id: created.id,
        currentAmountRaised: 25000,
      };

      const result = await updateCampaign(updateInput, testTenantId);

      expect(result.currentAmountRaised).toEqual(25000);
      expect(typeof result.currentAmountRaised).toBe('number');
    });

    it('should enforce tenant isolation', async () => {
      const created = await createCampaign(testCampaignInput);
      
      const updateInput: UpdateCampaignInput = {
        id: created.id,
        name: 'Should not update',
      };

      await expect(updateCampaign(updateInput, otherTenantId)).rejects.toThrow(/not found or access denied/i);
    });

    it('should throw error for non-existent campaign', async () => {
      const updateInput: UpdateCampaignInput = {
        id: 9999,
        name: 'Should not update',
      };

      await expect(updateCampaign(updateInput, testTenantId)).rejects.toThrow(/not found or access denied/i);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign successfully', async () => {
      const created = await createCampaign(testCampaignInput);

      await deleteCampaign(created.id, testTenantId);

      // Verify campaign is deleted
      const result = await getCampaignById(created.id, testTenantId);
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      const created = await createCampaign(testCampaignInput);

      await expect(deleteCampaign(created.id, otherTenantId)).rejects.toThrow(/not found or access denied/i);

      // Verify campaign still exists for correct tenant
      const result = await getCampaignById(created.id, testTenantId);
      expect(result).not.toBeNull();
    });

    it('should throw error for non-existent campaign', async () => {
      await expect(deleteCampaign(9999, testTenantId)).rejects.toThrow(/not found or access denied/i);
    });
  });
});