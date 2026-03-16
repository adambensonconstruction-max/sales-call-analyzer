import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { profile } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card className="glass-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile?.email || ''} disabled className="opacity-60" />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="glass-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle dark/light theme</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
