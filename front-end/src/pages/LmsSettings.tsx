import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Palette, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const LmsSettings = () => {
  const { user } = useAuth();
  const themeKey = user?.id ? `theme:${user.id}` : null;
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = themeKey ? localStorage.getItem(themeKey) : "light";
    const nextDarkMode = savedTheme === "dark";
    setDarkMode(nextDarkMode);
    document.documentElement.classList.toggle("dark", nextDarkMode);
  }, [themeKey]);

  const handleDarkModeChange = (checked: boolean) => {
    if (!themeKey) return;
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(themeKey, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(themeKey, "light");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Platform configuration and preferences</p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-display">General Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input defaultValue="Central Bank of Somalia" />
          </div>
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input defaultValue="CBS Staff Learning Management System" />
          </div>
          <div className="space-y-2">
            <Label>Admin Email</Label>
            <Input defaultValue={user?.email || "admin@cbs.gov.so"} type="email" />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-display">Appearance</CardTitle>
          </div>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">
                  {darkMode ? "Dark theme is active" : "Light theme is active"}
                </p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleDarkModeChange} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Reset</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
};

export default LmsSettings;
