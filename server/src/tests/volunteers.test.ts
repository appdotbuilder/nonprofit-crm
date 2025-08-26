import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { volunteersTable } from '../db/schema';
import { type CreateVolunteerInput, type UpdateVolunteerInput, type FilterInput } from '../schema';
import { 
  createVolunteer, 
  getVolunteers, 
  getVolunteerById, 
  updateVolunteer, 
  deleteVolunteer 
} from '../handlers/volunteers';
import { eq, and } from 'drizzle-orm';

// Test data
const testTenantId = '123e4567-e89b-12d3-a456-426614174000';
const otherTenantId = '987fcdeb-51a2-43d1-9f12-123456789000';

const testVolunteerInput: CreateVolunteerInput = {
  tenantId: testTenantId,
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, Anytown, USA',
  skills: 'Teaching, Event Planning, Marketing',
  availability: 'Weekends and evenings',
  notes: 'Very enthusiastic volunteer with prior experience',
  customFields: { experience_level: 'intermediate', background_check: true },
};

const minimalVolunteerInput: CreateVolunteerInput = {
  tenantId: testTenantId,
  name: 'Jane Doe',
  email: null,
  phone: null,
  address: null,
  skills: null,
  availability: null,
  notes: null,
  customFields: null,
};

describe('Volunteer Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createVolunteer', () => {
    it('should create a volunteer with all fields', async () => {
      const result = await createVolunteer(testVolunteerInput);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.name).toEqual('John Smith');
      expect(result.email).toEqual('john.smith@example.com');
      expect(result.phone).toEqual('+1-555-0123');
      expect(result.address).toEqual('123 Main St, Anytown, USA');
      expect(result.skills).toEqual('Teaching, Event Planning, Marketing');
      expect(result.availability).toEqual('Weekends and evenings');
      expect(result.notes).toEqual('Very enthusiastic volunteer with prior experience');
      expect(result.customFields).toEqual({ experience_level: 'intermediate', background_check: true });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a volunteer with minimal fields', async () => {
      const result = await createVolunteer(minimalVolunteerInput);

      expect(result.id).toBeDefined();
      expect(result.tenantId).toEqual(testTenantId);
      expect(result.name).toEqual('Jane Doe');
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.skills).toBeNull();
      expect(result.availability).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.customFields).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should save volunteer to database', async () => {
      const result = await createVolunteer(testVolunteerInput);

      const volunteers = await db.select()
        .from(volunteersTable)
        .where(eq(volunteersTable.id, result.id))
        .execute();

      expect(volunteers).toHaveLength(1);
      expect(volunteers[0].name).toEqual('John Smith');
      expect(volunteers[0].tenantId).toEqual(testTenantId);
      expect(volunteers[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getVolunteers', () => {
    beforeEach(async () => {
      // Create test volunteers
      await createVolunteer(testVolunteerInput);
      await createVolunteer({ ...minimalVolunteerInput, name: 'Alice Johnson' });
      await createVolunteer({
        ...testVolunteerInput,
        tenantId: otherTenantId,
        name: 'Bob Wilson'
      });
    });

    it('should get volunteers with pagination', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(result.volunteers[0].tenantId).toEqual(testTenantId);
      expect(result.volunteers[1].tenantId).toEqual(testTenantId);
    });

    it('should enforce tenant isolation', async () => {
      const filter: FilterInput = {
        tenantId: otherTenantId,
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.volunteers[0].name).toEqual('Bob Wilson');
      expect(result.volunteers[0].tenantId).toEqual(otherTenantId);
    });

    it('should filter by search term', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        search: 'john',
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(2); // John Smith and Alice Johnson
      expect(result.total).toEqual(2);
      expect(result.volunteers.some(v => v.name.includes('John'))).toBe(true);
    });

    it('should filter by email search', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        search: 'john.smith',
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(1);
      expect(result.volunteers[0].email).toEqual('john.smith@example.com');
    });

    it('should handle pagination correctly', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 1,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(1);
      expect(result.total).toEqual(2);
    });

    it('should sort by name ascending', async () => {
      const filter: FilterInput = {
        tenantId: testTenantId,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(2);
      expect(result.volunteers[0].name).toEqual('Alice Johnson');
      expect(result.volunteers[1].name).toEqual('John Smith');
    });

    it('should return empty results for non-existent tenant', async () => {
      const filter: FilterInput = {
        tenantId: '00000000-0000-0000-0000-000000000000',
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      };

      const result = await getVolunteers(filter);

      expect(result.volunteers).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('getVolunteerById', () => {
    let volunteerId: number;

    beforeEach(async () => {
      const volunteer = await createVolunteer(testVolunteerInput);
      volunteerId = volunteer.id;
    });

    it('should get volunteer by ID', async () => {
      const result = await getVolunteerById(volunteerId, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(volunteerId);
      expect(result!.name).toEqual('John Smith');
      expect(result!.tenantId).toEqual(testTenantId);
    });

    it('should enforce tenant isolation', async () => {
      const result = await getVolunteerById(volunteerId, otherTenantId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent volunteer', async () => {
      const result = await getVolunteerById(99999, testTenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateVolunteer', () => {
    let volunteerId: number;

    beforeEach(async () => {
      const volunteer = await createVolunteer(testVolunteerInput);
      volunteerId = volunteer.id;
    });

    it('should update volunteer fields', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: volunteerId,
        name: 'John Smith Updated',
        email: 'john.updated@example.com',
        skills: 'Updated skills'
      };

      const result = await updateVolunteer(updateInput, testTenantId);

      expect(result.id).toEqual(volunteerId);
      expect(result.name).toEqual('John Smith Updated');
      expect(result.email).toEqual('john.updated@example.com');
      expect(result.skills).toEqual('Updated skills');
      expect(result.phone).toEqual('+1-555-0123'); // Should remain unchanged
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should update only provided fields', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: volunteerId,
        name: 'New Name Only'
      };

      const result = await updateVolunteer(updateInput, testTenantId);

      expect(result.name).toEqual('New Name Only');
      expect(result.email).toEqual('john.smith@example.com'); // Should remain unchanged
      expect(result.skills).toEqual('Teaching, Event Planning, Marketing'); // Should remain unchanged
    });

    it('should update custom fields', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: volunteerId,
        customFields: { new_field: 'new_value', updated: true }
      };

      const result = await updateVolunteer(updateInput, testTenantId);

      expect(result.customFields).toEqual({ new_field: 'new_value', updated: true });
    });

    it('should throw error for non-existent volunteer', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: 99999,
        name: 'Should Fail'
      };

      await expect(updateVolunteer(updateInput, testTenantId))
        .rejects.toThrow(/not found/i);
    });

    it('should enforce tenant isolation', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: volunteerId,
        name: 'Should Fail'
      };

      await expect(updateVolunteer(updateInput, otherTenantId))
        .rejects.toThrow(/not found/i);
    });

    it('should persist changes to database', async () => {
      const updateInput: UpdateVolunteerInput = {
        id: volunteerId,
        name: 'Database Update Test'
      };

      await updateVolunteer(updateInput, testTenantId);

      const volunteers = await db.select()
        .from(volunteersTable)
        .where(eq(volunteersTable.id, volunteerId))
        .execute();

      expect(volunteers[0].name).toEqual('Database Update Test');
      expect(volunteers[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteVolunteer', () => {
    let volunteerId: number;

    beforeEach(async () => {
      const volunteer = await createVolunteer(testVolunteerInput);
      volunteerId = volunteer.id;
    });

    it('should delete volunteer', async () => {
      await deleteVolunteer(volunteerId, testTenantId);

      const result = await getVolunteerById(volunteerId, testTenantId);
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      await expect(deleteVolunteer(volunteerId, otherTenantId))
        .rejects.toThrow(/not found/i);

      // Volunteer should still exist
      const result = await getVolunteerById(volunteerId, testTenantId);
      expect(result).not.toBeNull();
    });

    it('should throw error for non-existent volunteer', async () => {
      await expect(deleteVolunteer(99999, testTenantId))
        .rejects.toThrow(/not found/i);
    });

    it('should remove volunteer from database', async () => {
      await deleteVolunteer(volunteerId, testTenantId);

      const volunteers = await db.select()
        .from(volunteersTable)
        .where(eq(volunteersTable.id, volunteerId))
        .execute();

      expect(volunteers).toHaveLength(0);
    });

    it('should not affect other volunteers', async () => {
      const otherVolunteer = await createVolunteer(minimalVolunteerInput);

      await deleteVolunteer(volunteerId, testTenantId);

      const result = await getVolunteerById(otherVolunteer.id, testTenantId);
      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Jane Doe');
    });
  });

  describe('error handling', () => {
    it('should handle database constraints gracefully', async () => {
      // This test verifies that database errors are properly handled
      const invalidInput = {
        ...testVolunteerInput,
        tenantId: 'invalid-uuid'
      } as CreateVolunteerInput;

      await expect(createVolunteer(invalidInput))
        .rejects.toThrow();
    });

    it('should handle concurrent updates', async () => {
      const volunteer = await createVolunteer(testVolunteerInput);

      const updateInput1: UpdateVolunteerInput = {
        id: volunteer.id,
        name: 'Update 1'
      };

      const updateInput2: UpdateVolunteerInput = {
        id: volunteer.id,
        name: 'Update 2'
      };

      // Both updates should succeed
      await Promise.all([
        updateVolunteer(updateInput1, testTenantId),
        updateVolunteer(updateInput2, testTenantId)
      ]);

      const result = await getVolunteerById(volunteer.id, testTenantId);
      expect(result).not.toBeNull();
      expect(['Update 1', 'Update 2']).toContain(result!.name);
    });
  });
});