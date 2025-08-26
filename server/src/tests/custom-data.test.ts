import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreateCustomDataInput, type UpdateCustomDataInput, type FilterInput } from '../schema';
import {
  createCustomData,
  getCustomData,
  getCustomDataById,
  updateCustomData,
  deleteCustomData,
  getCustomDataByType
} from '../handlers/custom-data';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_ID_2 = '550e8400-e29b-41d4-a716-446655440001';

// Test input data
const testCustomDataInput: CreateCustomDataInput = {
  tenantId: TENANT_ID,
  dataType: 'configuration',
  name: 'App Settings',
  description: 'Application configuration settings',
  data: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  }
};

const testCustomDataInput2: CreateCustomDataInput = {
  tenantId: TENANT_ID,
  dataType: 'user_preferences',
  name: 'User Dashboard Prefs',
  description: 'User dashboard preferences',
  data: {
    layout: 'grid',
    widgets: ['weather', 'calendar', 'tasks'],
    autoRefresh: 30
  }
};

describe('createCustomData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create custom data successfully', async () => {
    const result = await createCustomData(testCustomDataInput);

    expect(result.tenantId).toEqual(TENANT_ID);
    expect(result.dataType).toEqual('configuration');
    expect(result.name).toEqual('App Settings');
    expect(result.description).toEqual('Application configuration settings');
    // Use explicit data object to avoid TypeScript undefined issues
    const expectedData = {
      theme: 'dark',
      notifications: true,
      language: 'en'
    };
    expect(result.data).toEqual(expectedData);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create custom data with null description', async () => {
    const inputWithNullDesc: CreateCustomDataInput = {
      ...testCustomDataInput,
      description: null
    };

    const result = await createCustomData(inputWithNullDesc);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('App Settings');
    // Use explicit data object to avoid TypeScript undefined issues
    const expectedData = {
      theme: 'dark',
      notifications: true,
      language: 'en'
    };
    expect(result.data).toEqual(expectedData);
  });

  it('should create custom data with complex data structure', async () => {
    const complexDataInput: CreateCustomDataInput = {
      tenantId: TENANT_ID,
      dataType: 'complex_config',
      name: 'Complex Configuration',
      description: 'Complex nested configuration',
      data: {
        database: {
          host: 'localhost',
          port: 5432,
          ssl: true
        },
        features: ['feature1', 'feature2'],
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString()
        }
      }
    };

    const result = await createCustomData(complexDataInput);

    // For complex data, we can safely use the input since it's defined in this scope
    expect(result.data).toEqual(complexDataInput.data!);
    expect(typeof result.data).toBe('object');
  });
});

describe('getCustomData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get custom data with pagination', async () => {
    // Create test data
    await createCustomData(testCustomDataInput);
    await createCustomData(testCustomDataInput2);

    const filter: FilterInput = {
      tenantId: TENANT_ID,
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const result = await getCustomData(filter);

    expect(result.customData).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.customData[0].tenantId).toEqual(TENANT_ID);
  });

  it('should filter custom data by search term', async () => {
    // Create test data
    await createCustomData(testCustomDataInput);
    await createCustomData(testCustomDataInput2);

    const filter: FilterInput = {
      tenantId: TENANT_ID,
      search: 'App Settings',
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const result = await getCustomData(filter);

    expect(result.customData).toHaveLength(1);
    expect(result.customData[0].name).toEqual('App Settings');
    expect(result.total).toBe(1);
  });

  it('should search in dataType and description', async () => {
    await createCustomData(testCustomDataInput);
    await createCustomData(testCustomDataInput2);

    // Search by dataType
    const filterByDataType: FilterInput = {
      tenantId: TENANT_ID,
      search: 'configuration',
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const resultByDataType = await getCustomData(filterByDataType);
    expect(resultByDataType.customData).toHaveLength(1);
    expect(resultByDataType.customData[0].dataType).toEqual('configuration');

    // Search by description
    const filterByDescription: FilterInput = {
      tenantId: TENANT_ID,
      search: 'dashboard',
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const resultByDescription = await getCustomData(filterByDescription);
    expect(resultByDescription.customData).toHaveLength(1);
    expect(resultByDescription.customData[0].description).toContain('dashboard');
  });

  it('should enforce tenant isolation', async () => {
    // Create data for different tenants
    await createCustomData(testCustomDataInput);
    await createCustomData({ ...testCustomDataInput2, tenantId: TENANT_ID_2 });

    const filter: FilterInput = {
      tenantId: TENANT_ID,
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const result = await getCustomData(filter);

    expect(result.customData).toHaveLength(1);
    expect(result.customData[0].tenantId).toEqual(TENANT_ID);
    expect(result.total).toBe(1);
  });

  it('should handle empty results', async () => {
    const filter: FilterInput = {
      tenantId: TENANT_ID,
      page: 1,
      limit: 10,
      sortOrder: 'desc'
    };

    const result = await getCustomData(filter);

    expect(result.customData).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should handle pagination correctly', async () => {
    // Create multiple entries
    for (let i = 1; i <= 5; i++) {
      await createCustomData({
        ...testCustomDataInput,
        name: `Custom Data ${i}`,
        dataType: `type_${i}`
      });
    }

    // Get first page with limit 2
    const page1Filter: FilterInput = {
      tenantId: TENANT_ID,
      page: 1,
      limit: 2,
      sortOrder: 'desc'
    };

    const page1Result = await getCustomData(page1Filter);
    expect(page1Result.customData).toHaveLength(2);
    expect(page1Result.total).toBe(5);

    // Get second page with limit 2
    const page2Filter: FilterInput = {
      tenantId: TENANT_ID,
      page: 2,
      limit: 2,
      sortOrder: 'desc'
    };

    const page2Result = await getCustomData(page2Filter);
    expect(page2Result.customData).toHaveLength(2);
    expect(page2Result.total).toBe(5);

    // Verify different data on different pages
    expect(page1Result.customData[0].id).not.toBe(page2Result.customData[0].id);
  });
});

describe('getCustomDataById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get custom data by ID', async () => {
    const created = await createCustomData(testCustomDataInput);
    const result = await getCustomDataById(created.id, TENANT_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(created.id);
    expect(result!.name).toEqual('App Settings');
    // Use explicit data object to avoid TypeScript undefined issues
    const expectedData = {
      theme: 'dark',
      notifications: true,
      language: 'en'
    };
    expect(result!.data).toEqual(expectedData);
  });

  it('should enforce tenant isolation', async () => {
    const created = await createCustomData(testCustomDataInput);
    const result = await getCustomDataById(created.id, TENANT_ID_2);

    expect(result).toBeNull();
  });

  it('should return null for non-existent ID', async () => {
    const result = await getCustomDataById(99999, TENANT_ID);
    expect(result).toBeNull();
  });
});

describe('updateCustomData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update custom data successfully', async () => {
    const created = await createCustomData(testCustomDataInput);

    const updateInput: UpdateCustomDataInput = {
      id: created.id,
      name: 'Updated App Settings',
      description: 'Updated description',
      data: {
        theme: 'light',
        notifications: false,
        language: 'es'
      }
    };

    const result = await updateCustomData(updateInput, TENANT_ID);

    expect(result.id).toBe(created.id);
    expect(result.name).toEqual('Updated App Settings');
    expect(result.description).toEqual('Updated description');
    // Use explicit data object to match the updateInput.data
    const expectedUpdatedData = {
      theme: 'light',
      notifications: false,
      language: 'es'
    };
    expect(result.data).toEqual(expectedUpdatedData);
    expect(result.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it('should update only specified fields', async () => {
    const created = await createCustomData(testCustomDataInput);

    const updateInput: UpdateCustomDataInput = {
      id: created.id,
      name: 'Only Name Updated'
    };

    const result = await updateCustomData(updateInput, TENANT_ID);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual(created.description); // Should remain unchanged
    expect(result.dataType).toEqual(created.dataType); // Should remain unchanged
    // Verify data remains unchanged - use explicit data object
    const originalData = {
      theme: 'dark',
      notifications: true,
      language: 'en'
    };
    expect(result.data).toEqual(originalData); // Should remain unchanged
  });

  it('should enforce tenant isolation', async () => {
    const created = await createCustomData(testCustomDataInput);

    const updateInput: UpdateCustomDataInput = {
      id: created.id,
      name: 'Unauthorized Update'
    };

    await expect(updateCustomData(updateInput, TENANT_ID_2))
      .rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error for non-existent custom data', async () => {
    const updateInput: UpdateCustomDataInput = {
      id: 99999,
      name: 'Non-existent Update'
    };

    await expect(updateCustomData(updateInput, TENANT_ID))
      .rejects.toThrow(/not found or access denied/i);
  });
});

describe('deleteCustomData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete custom data successfully', async () => {
    const created = await createCustomData(testCustomDataInput);

    await deleteCustomData(created.id, TENANT_ID);

    // Verify deletion
    const result = await getCustomDataById(created.id, TENANT_ID);
    expect(result).toBeNull();
  });

  it('should enforce tenant isolation', async () => {
    const created = await createCustomData(testCustomDataInput);

    await expect(deleteCustomData(created.id, TENANT_ID_2))
      .rejects.toThrow(/not found or access denied/i);

    // Verify data still exists
    const result = await getCustomDataById(created.id, TENANT_ID);
    expect(result).not.toBeNull();
  });

  it('should throw error for non-existent custom data', async () => {
    await expect(deleteCustomData(99999, TENANT_ID))
      .rejects.toThrow(/not found or access denied/i);
  });
});

describe('getCustomDataByType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get custom data by type', async () => {
    // Create data with different types
    await createCustomData(testCustomDataInput);
    await createCustomData(testCustomDataInput2);
    await createCustomData({
      ...testCustomDataInput,
      name: 'Another Config',
      dataType: 'configuration'
    });

    const result = await getCustomDataByType('configuration', TENANT_ID);

    expect(result).toHaveLength(2);
    result.forEach(item => {
      expect(item.dataType).toEqual('configuration');
      expect(item.tenantId).toEqual(TENANT_ID);
    });
  });

  it('should enforce tenant isolation', async () => {
    // Create data for different tenants
    await createCustomData(testCustomDataInput);
    await createCustomData({ ...testCustomDataInput, tenantId: TENANT_ID_2 });

    const result = await getCustomDataByType('configuration', TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0].tenantId).toEqual(TENANT_ID);
  });

  it('should return empty array for non-existent type', async () => {
    await createCustomData(testCustomDataInput);

    const result = await getCustomDataByType('non_existent_type', TENANT_ID);
    expect(result).toHaveLength(0);
  });

  it('should return results sorted by creation date descending', async () => {
    // Create multiple entries with same type but different creation times
    const first = await createCustomData({
      ...testCustomDataInput,
      name: 'First Config'
    });

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const second = await createCustomData({
      ...testCustomDataInput,
      name: 'Second Config'
    });

    const result = await getCustomDataByType('configuration', TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(result[1].createdAt.getTime());
    expect(result[0].id).toBe(second.id); // Most recent first
    expect(result[1].id).toBe(first.id);
  });
});