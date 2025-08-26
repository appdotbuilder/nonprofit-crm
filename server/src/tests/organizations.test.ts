import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type CreateOrganizationInput, type UpdateOrganizationInput, type FilterInput } from '../schema';
import { 
  createOrganization, 
  getOrganizations, 
  getOrganizationById, 
  updateOrganization, 
  deleteOrganization 
} from '../handlers/organizations';
import { eq, and } from 'drizzle-orm';

const testTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const testTenantId2 = 'b1ffcd88-8d1c-5f09-cc7e-7cc0ce491b22';

const testOrganizationInput: CreateOrganizationInput = {
  tenantId: testTenantId,
  name: 'Test Foundation',
  contactPerson: 'John Smith',
  email: 'john@testfoundation.org',
  phone: '+1-555-0123',
  address: '123 Foundation St, City, ST 12345',
  type: 'Foundation',
  notes: 'Major grant provider for education initiatives',
  customFields: { category: 'Education', priority: 'High' },
};

const testFilterInput: FilterInput = {
  tenantId: testTenantId,
  page: 1,
  limit: 10,
  sortOrder: 'desc',
};

describe('Organizations Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createOrganization', () => {
    it('should create an organization with all fields', async () => {
      const result = await createOrganization(testOrganizationInput);

      expect(result.id).toBeDefined();
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.name).toEqual('Test Foundation');
      expect(result.contactPerson).toEqual('John Smith');
      expect(result.email).toEqual('john@testfoundation.org');
      expect(result.phone).toEqual('+1-555-0123');
      expect(result.address).toEqual('123 Foundation St, City, ST 12345');
      expect(result.type).toEqual('Foundation');
      expect(result.notes).toEqual('Major grant provider for education initiatives');
      expect(result.customFields).toEqual({ category: 'Education', priority: 'High' });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create an organization with minimal required fields', async () => {
      const minimalInput: CreateOrganizationInput = {
        tenantId: testTenantId,
        name: 'Minimal Foundation',
        contactPerson: null,
        email: null,
        phone: null,
        address: null,
        type: 'Foundation',
        notes: null,
        customFields: null,
      };

      const result = await createOrganization(minimalInput);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual('Minimal Foundation');
      expect(result.type).toEqual('Foundation');
      expect(result.contactPerson).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.customFields).toBeNull();
    });

    it('should save organization to database', async () => {
      const result = await createOrganization(testOrganizationInput);

      const organizations = await db.select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, result.id))
        .execute();

      expect(organizations).toHaveLength(1);
      expect(organizations[0].name).toEqual('Test Foundation');
      expect(organizations[0].tenantId).toEqual(testTenantId);
      expect(organizations[0].type).toEqual('Foundation');
    });

    it('should handle different organization types', async () => {
      const corporateInput = {
        ...testOrganizationInput,
        name: 'Corporate Partner',
        type: 'Corporate Partner' as const,
      };

      const result = await createOrganization(corporateInput);
      expect(result.type).toEqual('Corporate Partner');
    });
  });

  describe('getOrganizations', () => {
    beforeEach(async () => {
      // Create test organizations
      await createOrganization(testOrganizationInput);
      await createOrganization({
        ...testOrganizationInput,
        name: 'Another Foundation',
        type: 'Grant Maker',
      });
      await createOrganization({
        ...testOrganizationInput,
        tenantId: testTenantId2,
        name: 'Different Tenant Org',
      });
    });

    it('should get organizations for specific tenant', async () => {
      const result = await getOrganizations(testFilterInput);

      expect(result.organizations).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(result.organizations.every(org => org.tenantId === testTenantId)).toBe(true);
    });

    it('should enforce tenant isolation', async () => {
      const filterForTenant2: FilterInput = {
        ...testFilterInput,
        tenantId: testTenantId2,
      };

      const result = await getOrganizations(filterForTenant2);

      expect(result.organizations).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.organizations[0].name).toEqual('Different Tenant Org');
    });

    it('should handle pagination correctly', async () => {
      const pageFilter: FilterInput = {
        ...testFilterInput,
        page: 1,
        limit: 1,
      };

      const result = await getOrganizations(pageFilter);

      expect(result.organizations).toHaveLength(1);
      expect(result.total).toEqual(2);
    });

    it('should search organizations by name', async () => {
      const searchFilter: FilterInput = {
        ...testFilterInput,
        search: 'Another',
      };

      const result = await getOrganizations(searchFilter);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].name).toEqual('Another Foundation');
    });

    it('should search organizations by contact person', async () => {
      const searchFilter: FilterInput = {
        ...testFilterInput,
        search: 'John',
      };

      const result = await getOrganizations(searchFilter);

      expect(result.organizations.length).toBeGreaterThanOrEqual(1);
      expect(result.organizations.some(org => org.contactPerson?.includes('John'))).toBe(true);
    });

    it('should sort organizations by name ascending', async () => {
      const sortFilter: FilterInput = {
        ...testFilterInput,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = await getOrganizations(sortFilter);

      expect(result.organizations[0].name).toEqual('Another Foundation');
      expect(result.organizations[1].name).toEqual('Test Foundation');
    });

    it('should return empty results for non-existent tenant', async () => {
      const emptyFilter: FilterInput = {
        ...testFilterInput,
        tenantId: 'c2eebc99-0d2c-6ef0-dd8f-8dd1df592c33',
      };

      const result = await getOrganizations(emptyFilter);

      expect(result.organizations).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('getOrganizationById', () => {
    let organizationId: number;

    beforeEach(async () => {
      const organization = await createOrganization(testOrganizationInput);
      organizationId = organization.id;
    });

    it('should get organization by ID for correct tenant', async () => {
      const result = await getOrganizationById(organizationId, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(organizationId);
      expect(result!.name).toEqual('Test Foundation');
      expect(result!.tenantId).toEqual(testTenantId);
    });

    it('should return null for wrong tenant', async () => {
      const result = await getOrganizationById(organizationId, testTenantId2);

      expect(result).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const result = await getOrganizationById(99999, testTenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    let organizationId: number;

    beforeEach(async () => {
      const organization = await createOrganization(testOrganizationInput);
      organizationId = organization.id;
    });

    it('should update organization with all fields', async () => {
      const updateInput: UpdateOrganizationInput = {
        id: organizationId,
        name: 'Updated Foundation Name',
        contactPerson: 'Jane Doe',
        email: 'jane@updated.org',
        phone: '+1-555-9876',
        address: '456 Updated St, New City, ST 54321',
        type: 'Grant Maker',
        notes: 'Updated notes about the foundation',
        customFields: { category: 'Health', priority: 'Medium' },
      };

      const result = await updateOrganization(updateInput, testTenantId);

      expect(result.id).toEqual(organizationId);
      expect(result.name).toEqual('Updated Foundation Name');
      expect(result.contactPerson).toEqual('Jane Doe');
      expect(result.email).toEqual('jane@updated.org');
      expect(result.phone).toEqual('+1-555-9876');
      expect(result.address).toEqual('456 Updated St, New City, ST 54321');
      expect(result.type).toEqual('Grant Maker');
      expect(result.notes).toEqual('Updated notes about the foundation');
      expect(result.customFields).toEqual({ category: 'Health', priority: 'Medium' });
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should update organization with partial fields', async () => {
      const updateInput: UpdateOrganizationInput = {
        id: organizationId,
        name: 'Partially Updated Name',
        type: 'Corporate Partner',
      };

      const result = await updateOrganization(updateInput, testTenantId);

      expect(result.name).toEqual('Partially Updated Name');
      expect(result.type).toEqual('Corporate Partner');
      // Other fields should remain unchanged
      expect(result.contactPerson).toEqual('John Smith');
      expect(result.email).toEqual('john@testfoundation.org');
    });

    it('should throw error for non-existent organization', async () => {
      const updateInput: UpdateOrganizationInput = {
        id: 99999,
        name: 'Non-existent',
      };

      await expect(updateOrganization(updateInput, testTenantId))
        .rejects.toThrow(/not found/i);
    });

    it('should throw error for wrong tenant', async () => {
      const updateInput: UpdateOrganizationInput = {
        id: organizationId,
        name: 'Wrong tenant update',
      };

      await expect(updateOrganization(updateInput, testTenantId2))
        .rejects.toThrow(/not found/i);
    });

    it('should persist updates in database', async () => {
      const updateInput: UpdateOrganizationInput = {
        id: organizationId,
        name: 'Database Updated Name',
      };

      await updateOrganization(updateInput, testTenantId);

      const organizations = await db.select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, organizationId))
        .execute();

      expect(organizations[0].name).toEqual('Database Updated Name');
    });
  });

  describe('deleteOrganization', () => {
    let organizationId: number;

    beforeEach(async () => {
      const organization = await createOrganization(testOrganizationInput);
      organizationId = organization.id;
    });

    it('should delete organization for correct tenant', async () => {
      await deleteOrganization(organizationId, testTenantId);

      const result = await getOrganizationById(organizationId, testTenantId);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent organization', async () => {
      await expect(deleteOrganization(99999, testTenantId))
        .rejects.toThrow(/not found/i);
    });

    it('should throw error for wrong tenant', async () => {
      await expect(deleteOrganization(organizationId, testTenantId2))
        .rejects.toThrow(/not found/i);
    });

    it('should remove organization from database', async () => {
      await deleteOrganization(organizationId, testTenantId);

      const organizations = await db.select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, organizationId))
        .execute();

      expect(organizations).toHaveLength(0);
    });

    it('should not affect other organizations', async () => {
      // Create another organization
      const anotherOrg = await createOrganization({
        ...testOrganizationInput,
        name: 'Another Organization',
      });

      await deleteOrganization(organizationId, testTenantId);

      const remainingOrg = await getOrganizationById(anotherOrg.id, testTenantId);
      expect(remainingOrg).not.toBeNull();
      expect(remainingOrg!.name).toEqual('Another Organization');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should maintain complete tenant isolation across operations', async () => {
      // Create organizations in different tenants
      const org1 = await createOrganization(testOrganizationInput);
      const org2 = await createOrganization({
        ...testOrganizationInput,
        tenantId: testTenantId2,
        name: 'Tenant 2 Organization',
      });

      // Verify tenant 1 can only see their organizations
      const tenant1Orgs = await getOrganizations(testFilterInput);
      expect(tenant1Orgs.organizations).toHaveLength(1);
      expect(tenant1Orgs.organizations[0].id).toEqual(org1.id);

      // Verify tenant 2 can only see their organizations
      const tenant2Filter: FilterInput = { ...testFilterInput, tenantId: testTenantId2 };
      const tenant2Orgs = await getOrganizations(tenant2Filter);
      expect(tenant2Orgs.organizations).toHaveLength(1);
      expect(tenant2Orgs.organizations[0].id).toEqual(org2.id);

      // Verify cross-tenant operations fail
      expect(await getOrganizationById(org1.id, testTenantId2)).toBeNull();
      expect(await getOrganizationById(org2.id, testTenantId)).toBeNull();
    });
  });
});