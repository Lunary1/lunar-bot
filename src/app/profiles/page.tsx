"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  User,
  MapPin,
  CreditCard,
  Search,
  Star,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface ShippingProfile {
  id: string;
  user_id: string;
  profile_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  is_default: boolean;
  same_as_billing: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProfilesPage() {
  const { user } = useAuthContext();
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ShippingProfile | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    profile_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_postal_code: "",
    billing_country: "Belgium",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",
    shipping_country: "Belgium",
    is_default: false,
    same_as_billing: true,
  });

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("shipping_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
      setError("Failed to load shipping profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        profile_name: formData.profile_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        billing_street: formData.billing_street,
        billing_city: formData.billing_city,
        billing_state: formData.billing_state,
        billing_postal_code: formData.billing_postal_code,
        billing_country: formData.billing_country,
        shipping_street: formData.same_as_billing
          ? formData.billing_street
          : formData.shipping_street,
        shipping_city: formData.same_as_billing
          ? formData.billing_city
          : formData.shipping_city,
        shipping_state: formData.same_as_billing
          ? formData.billing_state
          : formData.shipping_state,
        shipping_postal_code: formData.same_as_billing
          ? formData.billing_postal_code
          : formData.shipping_postal_code,
        shipping_country: formData.same_as_billing
          ? formData.billing_country
          : formData.shipping_country,
        is_default: formData.is_default,
        same_as_billing: formData.same_as_billing,
      };

      if (editingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("shipping_profiles")
          .update(profileData)
          .eq("id", editingProfile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("shipping_profiles")
          .insert(profileData);

        if (error) throw error;
      }

      await loadProfiles();
      resetForm();
      setShowDialog(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile. Please try again.");
    }
  };

  const handleEdit = (profile: ShippingProfile) => {
    setEditingProfile(profile);
    setFormData({
      profile_name: profile.profile_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      phone: profile.phone || "",
      billing_street: profile.billing_street || "",
      billing_city: profile.billing_city || "",
      billing_state: profile.billing_state || "",
      billing_postal_code: profile.billing_postal_code || "",
      billing_country: profile.billing_country || "Belgium",
      shipping_street: profile.shipping_street || "",
      shipping_city: profile.shipping_city || "",
      shipping_state: profile.shipping_state || "",
      shipping_postal_code: profile.shipping_postal_code || "",
      shipping_country: profile.shipping_country || "Belgium",
      is_default: profile.is_default,
      same_as_billing: profile.same_as_billing,
    });
    setShowDialog(true);
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;

    try {
      const { error } = await supabase
        .from("shipping_profiles")
        .delete()
        .eq("id", profileId);

      if (error) throw error;
      await loadProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      profile_name: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      billing_street: "",
      billing_city: "",
      billing_state: "",
      billing_postal_code: "",
      billing_country: "Belgium",
      shipping_street: "",
      shipping_city: "",
      shipping_state: "",
      shipping_postal_code: "",
      shipping_country: "Belgium",
      is_default: false,
      same_as_billing: true,
    });
    setEditingProfile(null);
    setError(null);
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      // First, remove default status from all profiles
      await supabase
        .from("shipping_profiles")
        .update({ is_default: false })
        .eq("user_id", user?.id);

      // Then set the selected profile as default
      const { error } = await supabase
        .from("shipping_profiles")
        .update({ is_default: true })
        .eq("id", profileId);

      if (error) throw error;
      await loadProfiles();
    } catch (error) {
      console.error("Error setting default profile:", error);
      setError("Failed to set default profile. Please try again.");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading profiles...</p>
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Shipping Profiles
                </h1>
                <p className="text-gray-600">
                  Manage your shipping and billing information for faster
                  checkout
                </p>
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfile ? "Edit Profile" : "Create New Profile"}
                    </DialogTitle>
                    <DialogDescription>
                      Add billing and shipping information for automated
                      purchases
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="profile_name">Profile Name *</Label>
                          <Input
                            id="profile_name"
                            value={formData.profile_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                profile_name: e.target.value,
                              })
                            }
                            placeholder="e.g., Home, Work, Parents"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first_name">First Name *</Label>
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                first_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="last_name">Last Name *</Label>
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                last_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Billing Address
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="billing_street">Street Address</Label>
                          <Input
                            id="billing_street"
                            value={formData.billing_street}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                billing_street: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="billing_city">City</Label>
                            <Input
                              id="billing_city"
                              value={formData.billing_city}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  billing_city: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="billing_state">
                              State/Province
                            </Label>
                            <Input
                              id="billing_state"
                              value={formData.billing_state}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  billing_state: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="billing_postal_code">
                              Postal Code
                            </Label>
                            <Input
                              id="billing_postal_code"
                              value={formData.billing_postal_code}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  billing_postal_code: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="billing_country">Country</Label>
                          <Input
                            id="billing_country"
                            value={formData.billing_country}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                billing_country: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Shipping Address
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="shipping_street">
                            Street Address
                          </Label>
                          <Input
                            id="shipping_street"
                            value={formData.shipping_street}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_street: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="shipping_city">City</Label>
                            <Input
                              id="shipping_city"
                              value={formData.shipping_city}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  shipping_city: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="shipping_state">
                              State/Province
                            </Label>
                            <Input
                              id="shipping_state"
                              value={formData.shipping_state}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  shipping_state: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="shipping_postal_code">
                              Postal Code
                            </Label>
                            <Input
                              id="shipping_postal_code"
                              value={formData.shipping_postal_code}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  shipping_postal_code: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="shipping_country">Country</Label>
                          <Input
                            id="shipping_country"
                            value={formData.shipping_country}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_country: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProfile ? "Update Profile" : "Create Profile"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search profiles by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Profiles List */}
            {filteredProfiles.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {profiles.length === 0
                      ? "No profiles yet"
                      : "No matching profiles"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {profiles.length === 0
                      ? "Create your first shipping profile to get started with automated purchases."
                      : "Try adjusting your search to find the profile you're looking for."}
                  </p>
                  {profiles.length === 0 && (
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {profile.profile_name}
                        </CardTitle>
                        {profile.is_default && (
                          <Badge
                            variant="default"
                            className="flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {profile.first_name} {profile.last_name} •{" "}
                        {profile.email}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">
                          Billing Address
                        </h4>
                        <p className="text-sm text-gray-600">
                          {profile.billing_street && (
                            <>
                              {profile.billing_street}
                              <br />
                            </>
                          )}
                          {profile.billing_city && profile.billing_state && (
                            <>
                              {profile.billing_city}, {profile.billing_state}{" "}
                              {profile.billing_postal_code}
                              <br />
                            </>
                          )}
                          {profile.billing_country}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">
                          Shipping Address
                        </h4>
                        <p className="text-sm text-gray-600">
                          {profile.same_as_billing ? (
                            <span className="italic">
                              Same as billing address
                            </span>
                          ) : (
                            <>
                              {profile.shipping_street && (
                                <>
                                  {profile.shipping_street}
                                  <br />
                                </>
                              )}
                              {profile.shipping_city &&
                                profile.shipping_state && (
                                  <>
                                    {profile.shipping_city},{" "}
                                    {profile.shipping_state}{" "}
                                    {profile.shipping_postal_code}
                                    <br />
                                  </>
                                )}
                              {profile.shipping_country}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {!profile.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(profile.id)}
                            className="flex-1"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(profile.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
