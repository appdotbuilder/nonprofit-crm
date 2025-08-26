import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { donorsTable } from '../db/schema';
import { type CreateDonorInput } from '../schema';
import { createDonor } from '../handlers/donors';
import { eq } from 'drizzle-orm';

// Test tenant ID and input data
const testTenantId = '123e4567-e89b-12d3-a456-426614174000';

const testInput: CreateDonorInput = {
  tenantId: testTenantId,
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567',
  address: '123 Main St, Anytown, USA',
  notes: 'Regular donor, prefers online payments',
  customFields: {
    donorType: 'Individual',
    preferredContactMethod: 'email',
    interests: ['education', 'health']
  },
};

const minimalInput: CreateDonorInput = {
  tenantId: testTenantId,
  name: 'Jane Smith',
  email: null,
  phone: null,
  address: null,
  notes: null,
  customFields: null,
};

describe('createDonor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a donor with all fields', async () => {
    const result = await createDonor(testInput);

    // Validate all fields are correctly set
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1-555-123-4567');
    expect(result.address).toEqual('123 Main St, Anytown, USA');
    expect(result.notes).toEqual('Regular donor, prefers online payments');
    expect(result.customFields).toEqual({
      donorType: 'Individual',
      preferredContactMethod: 'email',
      interests: ['education', 'health']
    });
    expect(result.tenantId).toEqual(testTenantId);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a donor with minimal fields', async () => {
    const result = await createDonor(minimalInput);

    // Validate required fields
    expect(result.name).toEqual('Jane Smith');
    expect(result.tenantId).toEqual(testTenantId);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

    // Validate nullable fields
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.customFields).toBeNull();
  });

  it('should save donor to database', async () => {
    const result = await createDonor(testInput);

    // Query database to verify donor was saved
    const donors = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.id, result.id))
      .execute();

    expect(donors).toHaveLength(1);
    const savedDonor = donors[0];
    expect(savedDonor.name).toEqual('John Doe');
    expect(savedDonor.email).toEqual('john.doe@example.com');
    expect(savedDonor.phone).toEqual('+1-555-123-4567');
    expect(savedDonor.address).toEqual('123 Main St, Anytown, USA');
    expect(savedDonor.notes).toEqual('Regular donor, prefers online payments');
    expect(savedDonor.customFields).toEqual({
      donorType: 'Individual',
      preferredContactMethod: 'email',
      interests: ['education', 'health']
    });
    expect(savedDonor.tenantId).toEqual(testTenantId);
    expect(savedDonor.createdAt).toBeInstanceOf(Date);
    expect(savedDonor.updatedAt).toBeInstanceOf(Date);
  });

  it('should enforce tenant isolation', async () => {
    const tenant1Id = '123e4567-e89b-12d3-a456-426614174001';
    const tenant2Id = '123e4567-e89b-12d3-a456-426614174002';

    // Create donors for different tenants
    const donor1 = await createDonor({
      ...testInput,
      tenantId: tenant1Id,
      name: 'Tenant 1 Donor'
    });

    const donor2 = await createDonor({
      ...testInput,
      tenantId: tenant2Id,
      name: 'Tenant 2 Donor'
    });

    // Verify each donor has correct tenant ID
    expect(donor1.tenantId).toEqual(tenant1Id);
    expect(donor2.tenantId).toEqual(tenant2Id);

    // Verify they have different IDs
    expect(donor1.id).not.toEqual(donor2.id);

    // Query database to verify both donors exist with correct tenant IDs
    const tenant1Donors = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.tenantId, tenant1Id))
      .execute();

    const tenant2Donors = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.tenantId, tenant2Id))
      .execute();

    expect(tenant1Donors).toHaveLength(1);
    expect(tenant2Donors).toHaveLength(1);
    expect(tenant1Donors[0].name).toEqual('Tenant 1 Donor');
    expect(tenant2Donors[0].name).toEqual('Tenant 2 Donor');
  });

  it('should handle complex custom fields', async () => {
    const complexCustomFields = {
      preferences: {
        communication: ['email', 'phone'],
        donationFrequency: 'monthly',
        causes: {
          primary: 'education',
          secondary: ['health', 'environment']
        }
      },
      metadata: {
        source: 'website',
        campaign: 'spring2024',
        referrer: null
      },
      tags: ['vip', 'recurring', 'major-donor']
    };

    const result = await createDonor({
      ...testInput,
      name: 'Complex Donor',
      customFields: complexCustomFields
    });

    expect(result.customFields).toEqual(complexCustomFields);

    // Verify in database
    const donors = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.id, result.id))
      .execute();

    expect(donors[0].customFields).toEqual(complexCustomFields);
  });

  it('should create multiple donors successfully', async () => {
    const inputs = [
      { ...testInput, name: 'Donor One', email: 'one@example.com' },
      { ...testInput, name: 'Donor Two', email: 'two@example.com' },
      { ...testInput, name: 'Donor Three', email: 'three@example.com' }
    ];

    const results = await Promise.all(inputs.map(input => createDonor(input)));

    // Verify all donors were created with unique IDs
    expect(results).toHaveLength(3);
    const ids = results.map(r => r.id);
    expect(new Set(ids)).toHaveProperty('size', 3); // All IDs are unique

    // Verify all donors exist in database
    const allDonors = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.tenantId, testTenantId))
      .execute();

    expect(allDonors).toHaveLength(3);
  });
});