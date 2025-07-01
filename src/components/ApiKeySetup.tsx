import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKeySetupProps {
  onConnect: (apiKey: string) => Promise<void>;
  onBack?: () => void;
}

export function ApiKeySetup({ onConnect, onBack }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your Motion API key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConnect(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Motion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6"
          >
            ← Back
          </Button>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Connect to Motion</CardTitle>
            <CardDescription>
              Enter your Motion API key to start tracking your workload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Motion API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="pr-20 font-mono"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 text-xs"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How to get your API key:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Log in to Motion at <span className="font-mono">app.usemotion.com</span></li>
                  <li>Go to Settings → API & Integrations</li>
                  <li>Click "Create New API Key"</li>
                  <li>Copy the key and paste it above</li>
                </ol>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || !apiKey.trim()}
              >
                {isLoading ? 'Connecting...' : 'Connect to Motion'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}