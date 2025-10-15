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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User, MapPin, CreditCard } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  billing_address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
  updated_at: string;
}

export default function ProfilesPage() {
  const { user } = useAuthContext();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_postal_code: "",
    billing_country: "",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",
    shipping_country: "",
  });

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
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
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        billing_address: {
          street: formData.billing_street,
          city: formData.billing_city,
          state: formData.billing_state,
          postal_code: formData.billing_postal_code,
          country: formData.billing_country,
        },
        shipping_address: {
          street: formData.shipping_street,
          city: formData.shipping_city,
          state: formData.shipping_state,
          postal_code: formData.shipping_postal_code,
          country: formData.shipping_country,
        },
      };

      if (editingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("user_profiles")
          .update(profileData)
          .eq("id", editingProfile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("user_profiles")
          .insert(profileData);

        if (error) throw error;
      }

      await loadProfiles();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleEdit = (profile: UserProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || "",
      billing_street: profile.billing_address?.street || "",
      billing_city: profile.billing_address?.city || "",
      billing_state: profile.billing_address?.state || "",
      billing_postal_code: profile.billing_address?.postal_code || "",
      billing_country: profile.billing_address?.country || "",
      shipping_street: profile.shipping_address?.street || "",
      shipping_city: profile.shipping_address?.city || "",
      shipping_state: profile.shipping_address?.state || "",
      shipping_postal_code: profile.shipping_address?.postal_code || "",
      shipping_country: profile.shipping_address?.country || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
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
      name: "",
      email: "",
      phone: "",
      billing_street: "",
      billing_city: "",
      billing_state: "",
      billing_postal_code: "",
      billing_country: "",
      shipping_street: "",
      shipping_city: "",
      shipping_state: "",
      shipping_postal_code: "",
      shipping_country: "",
    });
    setEditingProfile(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Billing & Shipping Profiles
              </h1>
              <p className="text-gray-600">
                Manage your billing and shipping information for automated
                purchases
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
                    Add billing and shipping information for automated purchases
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
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
                            setFormData({ ...formData, email: e.target.value })
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
                            setFormData({ ...formData, phone: e.target.value })
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
                          <Label htmlFor="billing_state">State/Province</Label>
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
                        <Label htmlFor="shipping_street">Street Address</Label>
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
                          <Label htmlFor="shipping_state">State/Province</Label>
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

          {/* Profiles List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading profiles...</p>
            </div>
          ) : profiles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No profiles found
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first billing and shipping profile to get started
                  with automated purchases.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(profile)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(profile.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{profile.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">
                        Billing Address
                      </h4>
                      <p className="text-sm text-gray-600">
                        {profile.billing_address?.street && (
                          <>
                            {profile.billing_address.street}
                            <br />
                          </>
                        )}
                        {profile.billing_address?.city &&
                          profile.billing_address?.state && (
                            <>
                              {profile.billing_address.city},{" "}
                              {profile.billing_address.state}{" "}
                              {profile.billing_address.postal_code}
                              <br />
                            </>
                          )}
                        {profile.billing_address?.country}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">
                        Shipping Address
                      </h4>
                      <p className="text-sm text-gray-600">
                        {profile.shipping_address?.street && (
                          <>
                            {profile.shipping_address.street}
                            <br />
                          </>
                        )}
                        {profile.shipping_address?.city &&
                          profile.shipping_address?.state && (
                            <>
                              {profile.shipping_address.city},{" "}
                              {profile.shipping_address.state}{" "}
                              {profile.shipping_address.postal_code}
                              <br />
                            </>
                          )}
                        {profile.shipping_address?.country}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        Created{" "}
                        {new Date(profile.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
