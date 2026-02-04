'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInviteInfo, useAcceptInvite } from '@/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: inviteInfo, isLoading, error: fetchError } = useInviteInfo(code);
  const acceptMutation = useAcceptInvite();

  const handleAccept = () => {
    setIsAccepting(true);
    setError(null);
    acceptMutation.mutate({ code }, {
      onSuccess: (result) => {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/organizations/${result.organizationId}`);
        }, 2000);
      },
      onError: (err) => {
        setError(err.message);
        setIsAccepting(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">Invalid Invite</h2>
            <p className="mt-2 text-muted-foreground">{fetchError.message}</p>
            <Link href="/">
              <Button className="mt-6">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">Welcome!</h2>
            <p className="mt-2 text-muted-foreground">
              You&apos;ve joined {inviteInfo?.organizationName}. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Organization</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">
              {inviteInfo?.organizationName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ll join as <span className="font-medium capitalize">{inviteInfo?.role}</span>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you&apos;ll become a member of this organization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
