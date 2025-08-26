import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { Users, Gift, Target, Calendar, Building2, Award, TrendingUp, DollarSign } from 'lucide-react';
import type { Donor, Donation, Campaign, Volunteer, Event, Organization, Grant } from '../../../server/src/schema';

interface DashboardProps {
  tenantId: string;
}

interface DashboardStats {
  totalDonors: number;
  totalDonations: number;
  totalAmount: number;
  activeCampaigns: number;
  totalVolunteers: number;
  upcomingEvents: number;
  totalOrganizations: number;
  activeGrants: number;
}

function Dashboard({ tenantId }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch data from all entities
      const [
        donorsResponse,
        donationsResponse,
        campaignsResponse,
        volunteersResponse,
        eventsResponse,
        organizationsResponse,
        grantsResponse,
      ] = await Promise.all([
        trpc.donors.list.query({ tenantId, page: 1, limit: 1 }),
        trpc.donations.list.query({ tenantId, page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
        trpc.campaigns.list.query({ tenantId, page: 1, limit: 10 }),
        trpc.volunteers.list.query({ tenantId, page: 1, limit: 1 }),
        trpc.events.list.query({ tenantId, page: 1, limit: 5, sortBy: 'date', sortOrder: 'asc' }),
        trpc.organizations.list.query({ tenantId, page: 1, limit: 1 }),
        trpc.grants.list.query({ tenantId, page: 1, limit: 1 }),
      ]);

      // Calculate statistics
      const totalAmount = donationsResponse.donations.reduce((sum: number, donation: Donation) => sum + donation.amount, 0);
      const activeCampaignCount = campaignsResponse.campaigns.filter((c: Campaign) => c.status === 'Active').length;
      const upcomingEventCount = eventsResponse.events.filter((e: Event) => new Date(e.date) > new Date()).length;
      const activeGrantCount = grantsResponse.grants.filter((g: Grant) => g.status === 'Awarded' || g.status === 'Under Review').length;

      setStats({
        totalDonors: donorsResponse.total,
        totalDonations: donationsResponse.total,
        totalAmount,
        activeCampaigns: activeCampaignCount,
        totalVolunteers: volunteersResponse.total,
        upcomingEvents: upcomingEventCount,
        totalOrganizations: organizationsResponse.total,
        activeGrants: activeGrantCount,
      });

      setRecentDonations(donationsResponse.donations);
      setActiveCampaigns(campaignsResponse.campaigns.filter((c: Campaign) => c.status === 'Active'));
      setUpcomingEvents(eventsResponse.events.filter((e: Event) => new Date(e.date) > new Date()).slice(0, 3));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Donors',
      value: stats?.totalDonors || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Donations',
      value: `$${stats?.totalAmount.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Volunteers',
      value: stats?.totalVolunteers || 0,
      icon: Users,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Upcoming Events',
      value: stats?.upcomingEvents || 0,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Organizations',
      value: stats?.totalOrganizations || 0,
      icon: Building2,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Active Grants',
      value: stats?.activeGrants || 0,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Donation Count',
      value: stats?.totalDonations || 0,
      icon: Gift,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <Badge variant="outline" className="text-sm">
          🏢 Multi-Tenant CRM
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Donations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-purple-600" />
              <span>Recent Donations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDonations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No donations yet</p>
              ) : (
                recentDonations.slice(0, 5).map((donation: Donation) => (
                  <div key={donation.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">${donation.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(donation.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={donation.status === 'Received' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {donation.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-orange-600" />
              <span>Active Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active campaigns</p>
              ) : (
                activeCampaigns.slice(0, 3).map((campaign: Campaign) => {
                  const progress = campaign.goalAmount > 0 
                    ? (campaign.currentAmountRaised / campaign.goalAmount) * 100 
                    : 0;
                  
                  return (
                    <div key={campaign.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{campaign.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>${campaign.currentAmountRaised.toLocaleString()}</span>
                          <span>${campaign.goalAmount.toLocaleString()}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <p className="text-xs text-gray-500">
                          {progress.toFixed(1)}% of goal reached
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>Upcoming Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming events</p>
              ) : (
                upcomingEvents.map((event: Event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{event.name}</p>
                      <p className="text-xs text-gray-500">
                        📍 {event.location || 'Location TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Quick Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${((stats?.totalAmount || 0) / (stats?.totalDonations || 1)).toFixed(0)}
                  </p>
                  <p className="text-xs text-green-700">Avg Donation</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((stats?.totalDonations || 0) / (stats?.totalDonors || 1) * 10) / 10}
                  </p>
                  <p className="text-xs text-blue-700">Donations per Donor</p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 text-center">
                  📊 Data refreshed automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;