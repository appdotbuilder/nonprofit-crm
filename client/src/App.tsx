import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Gift, Calendar, Building2, Award, Database, Target } from 'lucide-react';

// Import all entity management components
import DonorManagement from '@/components/DonorManagement';
import CampaignManagement from '@/components/CampaignManagement';
import DonationManagement from '@/components/DonationManagement';
import VolunteerManagement from '@/components/VolunteerManagement';
import EventManagement from '@/components/EventManagement';
import OrganizationManagement from '@/components/OrganizationManagement';
import GrantManagement from '@/components/GrantManagement';
import CustomDataManagement from '@/components/CustomDataManagement';
import Dashboard from '@/components/Dashboard';

// Mock tenant ID - in a real app, this would come from authentication
const MOCK_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Target, color: 'bg-blue-500' },
    { id: 'donors', label: 'Donors', icon: Users, color: 'bg-green-500' },
    { id: 'donations', label: 'Donations', icon: Gift, color: 'bg-purple-500' },
    { id: 'campaigns', label: 'Campaigns', icon: Target, color: 'bg-orange-500' },
    { id: 'volunteers', label: 'Volunteers', icon: Heart, color: 'bg-pink-500' },
    { id: 'events', label: 'Events', icon: Calendar, color: 'bg-indigo-500' },
    { id: 'organizations', label: 'Organizations', icon: Building2, color: 'bg-cyan-500' },
    { id: 'grants', label: 'Grants', icon: Award, color: 'bg-yellow-500' },
    { id: 'custom-data', label: 'Custom Data', icon: Database, color: 'bg-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NonProfit CRM</h1>
                <p className="text-xs text-gray-500">Multi-tenant Platform</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Tenant: {MOCK_TENANT_ID.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 mb-6">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex items-center space-x-2 px-3 py-2"
                >
                  <div className={`w-4 h-4 rounded-full ${item.color} flex items-center justify-center`}>
                    <IconComponent className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="hidden sm:inline text-xs">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="donors" className="mt-0">
            <DonorManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="donations" className="mt-0">
            <DonationManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="volunteers" className="mt-0">
            <VolunteerManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <EventManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="organizations" className="mt-0">
            <OrganizationManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="grants" className="mt-0">
            <GrantManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>

          <TabsContent value="custom-data" className="mt-0">
            <CustomDataManagement tenantId={MOCK_TENANT_ID} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;