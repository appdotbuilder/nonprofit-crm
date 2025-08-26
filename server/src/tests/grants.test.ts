import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { grantsTable, organizationsTable } from '../db/schema';
import { type CreateGrantInput, type UpdateGrantInput, type FilterInput } from '../schema';
import { 
  createGrant, 
  getGrants, 
  getGrantById, 
  updateGrant, 
  deleteGrant, 
  getGrantsByOrganization 
} from '../handlers/grants';
import { eq, and } from 'drizzle-orm';

// Test data
const testTenantId = '123e4567-e89b-12d3-a456-426614174000';
const otherTenantId = '987fcdeb-a123-45d6-b789-123456789abc';

// Test organization data
const testOrganizationData = {
  tenantId: testTenantId,
  name: 'Test Foundation',
  contactPerson: 'John Doe',
  email: 'contact@testfoundation.org',
  phone: '+1234567890',
  address: '123 Foundation St',
  type: 'Foundation' as const,
  notes: 'Test foundation for grants',
  customFields: { priority: 'high' },
};

const otherTenantOrganizationData = {
  tenantId: otherTenantId,
  name: 'Other Foundation',
  contactPerson: 'Jane Smith',
  email: 'contact@otherfoundation.org',
  phone: '+0987654321',
  address: '456 Other St',
  type: 'Foundation' as const,
  notes: 'Other tenant foundation',
  customFields: null,
};

// Test grant input
const testGrantInput: CreateGrantInput = {
  tenantId: testTenantId,
  organizationId: 0, // Will be set after creating organization
  grantName: 'Environmental Research Grant',
  applicationDate: new Date('2024-01-15'),
  awardDate: new Date('2024-03-01'),
  amount: 50000.00,
  status: 'Awarded',
  reportingRequirements: 'Quarterly reports required',
  customFields: { department: 'research', priority: 'high' },
};

describe('grants handlers', () => {
  let testOrganizationId: number;
  let otherTenantOrganizationId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test organizations
    const orgResult = await db.insert(organizationsTable)
      .values(testOrganizationData)
      .returning()
      .execute();
    testOrganizationId = orgResult[0].id;

    const otherOrgResult = await db.insert(organizationsTable)
      .values(otherTenantOrganizationData)
      .returning()
      .execute();
    otherTenantOrganizationId = otherOrgResult[0].id;

    // Update test input with the created organization ID
    testGrantInput.organizationId = testOrganizationId;
  });

  afterEach(resetDB);

  describe('createGrant', () => {
    it('should create a grant successfully', async () => {
      const result = await createGrant(testGrantInput);

      expect(result.grantName).toEqual('Environmental Research Grant');
      expect(result.organizationId).toEqual(testOrganizationId);
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.amount).toEqual(50000.00);
      expect(typeof result.amount).toBe('number');
      expect(result.status).toEqual('Awarded');
      expect(result.reportingRequirements).toEqual('Quarterly reports required');
      expect(result.customFields).toEqual({ department: 'research', priority: 'high' });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should save grant to database with correct numeric conversion', async () => {
      const result = await createGrant(testGrantInput);

      const grants = await db.select()
        .from(grantsTable)
        .where(eq(grantsTable.id, result.id))
        .execute();

      expect(grants).toHaveLength(1);
      expect(grants[0].grantName).toEqual('Environmental Research Grant');
      expect(grants[0].organizationId).toEqual(testOrganizationId);
      expect(parseFloat(grants[0].amount)).toEqual(50000.00);
      expect(grants[0].status).toEqual('Awarded');
      expect(grants[0].customFields).toEqual({ department: 'research', priority: 'high' });
    });

    it('should reject grant for non-existent organization', async () => {
      const invalidInput = {
        ...testGrantInput,
        organizationId: 99999,
      };

      expect(createGrant(invalidInput)).rejects.toThrow(/organization not found/i);
    });

    it('should reject grant for organization from different tenant', async () => {
      const invalidInput = {
        ...testGrantInput,
        organizationId: otherTenantOrganizationId,
      };

      expect(createGrant(invalidInput)).rejects.toThrow(/organization not found/i);
    });
  });

  describe('getGrants', () => {
    beforeEach(async () => {
      // Create multiple test grants
      await createGrant(testGrantInput);
      
      const secondGrantInput = {
        ...testGrantInput,
        grantName: 'Education Initiative Grant',
        amount: 25000.00,
        status: 'Applied' as const,
      };
      await createGrant(secondGrantInput);
    });

    it('should return grants with pagination', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getGrants(filter);

      expect(result.grants).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(result.grants[0].amount).toEqual(25000.00);
      expect(typeof result.grants[0].amount).toBe('number');
      expect(result.grants[0].grantName).toEqual('Education Initiative Grant');
      expect(result.grants[1].grantName).toEqual('Environmental Research Grant');
    });

    it('should filter grants by search term', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        search: 'Environmental',
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getGrants(filter);

      expect(result.grants).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.grants[0].grantName).toEqual('Environmental Research Grant');
    });

    it('should sort grants by different fields', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        sortBy: 'grantName',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      const result = await getGrants(filter);

      expect(result.grants).toHaveLength(2);
      expect(result.grants[0].grantName).toEqual('Education Initiative Grant');
      expect(result.grants[1].grantName).toEqual('Environmental Research Grant');
    });

    it('should respect tenant isolation', async () => {
      const filter: FilterInput = {
        tenantId: otherTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      };

      const result = await getGrants(filter);

      expect(result.grants).toHaveLength(0);
      expect(result.total).toEqual(0);
    });

    it('should handle pagination correctly', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 2,
        limit: 1,
        sortOrder: 'desc',
      };

      const result = await getGrants(filter);

      expect(result.grants).toHaveLength(1);
      expect(result.total).toEqual(2);
      expect(result.grants[0].grantName).toEqual('Environmental Research Grant');
    });
  });

  describe('getGrantById', () => {
    let testGrantId: number;

    beforeEach(async () => {
      const grant = await createGrant(testGrantInput);
      testGrantId = grant.id;
    });

    it('should return grant by ID', async () => {
      const result = await getGrantById(testGrantId, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testGrantId);
      expect(result!.grantName).toEqual('Environmental Research Grant');
      expect(result!.amount).toEqual(50000.00);
      expect(typeof result!.amount).toBe('number');
      expect(result!.tenantId).toEqual(testTenantId);
    });

    it('should return null for non-existent grant', async () => {
      const result = await getGrantById(99999, testTenantId);

      expect(result).toBeNull();
    });

    it('should return null for grant from different tenant', async () => {
      const result = await getGrantById(testGrantId, otherTenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateGrant', () => {
    let testGrantId: number;

    beforeEach(async () => {
      const grant = await createGrant(testGrantInput);
      testGrantId = grant.id;
    });

    it('should update grant successfully', async () => {
      const updateInput: UpdateGrantInput = {
        id: testGrantId,
        grantName: 'Updated Grant Name',
        amount: 75000.00,
        status: 'Completed',
      };

      const result = await updateGrant(updateInput, testTenantId);

      expect(result.id).toEqual(testGrantId);
      expect(result.grantName).toEqual('Updated Grant Name');
      expect(result.amount).toEqual(75000.00);
      expect(typeof result.amount).toBe('number');
      expect(result.status).toEqual('Completed');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should update grant in database', async () => {
      const updateInput: UpdateGrantInput = {
        id: testGrantId,
        grantName: 'Updated Grant Name',
        amount: 75000.00,
      };

      await updateGrant(updateInput, testTenantId);

      const grants = await db.select()
        .from(grantsTable)
        .where(eq(grantsTable.id, testGrantId))
        .execute();

      expect(grants).toHaveLength(1);
      expect(grants[0].grantName).toEqual('Updated Grant Name');
      expect(parseFloat(grants[0].amount)).toEqual(75000.00);
    });

    it('should reject update for non-existent grant', async () => {
      const updateInput: UpdateGrantInput = {
        id: 99999,
        grantName: 'Updated Grant Name',
      };

      expect(updateGrant(updateInput, testTenantId)).rejects.toThrow(/grant not found/i);
    });

    it('should reject update for grant from different tenant', async () => {
      const updateInput: UpdateGrantInput = {
        id: testGrantId,
        grantName: 'Updated Grant Name',
      };

      expect(updateGrant(updateInput, otherTenantId)).rejects.toThrow(/grant not found/i);
    });

    it('should reject update with invalid organization ID', async () => {
      const updateInput: UpdateGrantInput = {
        id: testGrantId,
        organizationId: 99999,
      };

      expect(updateGrant(updateInput, testTenantId)).rejects.toThrow(/organization not found/i);
    });
  });

  describe('deleteGrant', () => {
    let testGrantId: number;

    beforeEach(async () => {
      const grant = await createGrant(testGrantInput);
      testGrantId = grant.id;
    });

    it('should delete grant successfully', async () => {
      await deleteGrant(testGrantId, testTenantId);

      const grants = await db.select()
        .from(grantsTable)
        .where(eq(grantsTable.id, testGrantId))
        .execute();

      expect(grants).toHaveLength(0);
    });

    it('should reject delete for non-existent grant', async () => {
      expect(deleteGrant(99999, testTenantId)).rejects.toThrow(/grant not found/i);
    });

    it('should reject delete for grant from different tenant', async () => {
      expect(deleteGrant(testGrantId, otherTenantId)).rejects.toThrow(/grant not found/i);
    });
  });

  describe('getGrantsByOrganization', () => {
    beforeEach(async () => {
      // Create grants for the test organization
      await createGrant(testGrantInput);
      
      const secondGrantInput = {
        ...testGrantInput,
        grantName: 'Second Organization Grant',
        amount: 30000.00,
      };
      await createGrant(secondGrantInput);
    });

    it('should return grants for specific organization', async () => {
      const result = await getGrantsByOrganization(testOrganizationId, testTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].organizationId).toEqual(testOrganizationId);
      expect(result[1].organizationId).toEqual(testOrganizationId);
      expect(result[0].amount).toEqual(30000.00);
      expect(typeof result[0].amount).toBe('number');
      expect(result[1].amount).toEqual(50000.00);
    });

    it('should return empty array for organization with no grants', async () => {
      // Create a new organization without grants
      const newOrgResult = await db.insert(organizationsTable)
        .values({
          ...testOrganizationData,
          name: 'New Organization',
        })
        .returning()
        .execute();

      const result = await getGrantsByOrganization(newOrgResult[0].id, testTenantId);

      expect(result).toHaveLength(0);
    });

    it('should reject request for non-existent organization', async () => {
      expect(getGrantsByOrganization(99999, testTenantId)).rejects.toThrow(/organization not found/i);
    });

    it('should reject request for organization from different tenant', async () => {
      expect(getGrantsByOrganization(otherTenantOrganizationId, testTenantId)).rejects.toThrow(/organization not found/i);
    });
  });
});