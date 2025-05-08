'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useAuthApi } from '@/lib/api/use-auth-api';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from './Spinner';

export function ApiExample() {
  const { user } = useAuth();
  const api = useAuthApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  // Example of making an API call
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Example API call with auth headers
      const response = await api.get<Record<string, unknown>>('/tms');
      console.log('API response:', response);
      setData(response);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Optional: Fetch data when component mounts if authenticated
  // useEffect(() => {
  //   if (api.isAuthenticated) {
  //     fetchData();
  //   }
  // }, [api.isAuthenticated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Authentication Example</CardTitle>
        <CardDescription>
          Shows how to make authenticated API calls to the backend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Authentication Status:</h3>
            <p>{api.isAuthenticated ? 'Authenticated ✅' : 'Not authenticated ❌'}</p>
            
            {user && (
              <div className="mt-2">
                <p><span className="text-muted-foreground">User:</span> {user.name}</p>
                <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={fetchData} 
              disabled={loading || !api.isAuthenticated}
            >
              {loading ? <Spinner size="small" left={true} /> : 'Test API Call'}
            </Button>

            {!api.isAuthenticated && (
              <p className="text-sm text-amber-500">
                Please sign in first to test API calls
              </p>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              <h4 className="font-semibold">Error:</h4>
              <p>{error}</p>
            </div>
          )}

          {data && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">API Response:</h3>
              <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-[300px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 