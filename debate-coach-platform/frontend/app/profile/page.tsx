"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getUserProfile, updateUserProfile, getUserSkills, updateUserSkills, UserProfile, Skill } from "@/services/auth";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillScore, setNewSkillScore] = useState(75);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [profileData, skillsData] = await Promise.all([getUserProfile(), getUserSkills()]);
        setProfile(profileData);
        setSkills(skillsData);
        setBio(profileData.bio || "");
        setExpertise(profileData.expertise_areas || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleUpdateProfile() {
    setUpdating(true);
    setError("");
    setSuccessMsg("");

    try {
      const updated = await updateUserProfile({
        bio: bio || undefined,
        expertise_areas: expertise || undefined,
      });
      setProfile(updated);
      setSuccessMsg("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddSkill() {
    if (!newSkillName.trim()) {
      setError("Skill name is required");
      return;
    }

    setUpdating(true);
    setError("");
    setSuccessMsg("");

    try {
      const updatedSkills = await updateUserSkills([
        ...skills.map((s) => ({ skill_name: s.name, score: s.score })),
        { skill_name: newSkillName, score: newSkillScore },
      ]);
      setSkills(updatedSkills);
      setNewSkillName("");
      setNewSkillScore(75);
      setSuccessMsg("Skill added successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateSkill(skillName: string, newScore: number) {
    setUpdating(true);
    setError("");
    setSuccessMsg("");

    try {
      const updatedSkills = await updateUserSkills(
        skills.map((s) => ({
          skill_name: s.name,
          score: s.name === skillName ? newScore : s.score,
        }))
      );
      setSkills(updatedSkills);
      setSuccessMsg("Skill updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center text-teal-700 hover:text-teal-800">
          ← Back to dashboard
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">My profile</h1>

          {profile && (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Debates completed</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{profile.debate_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Win rate</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{(profile.win_rate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-6 border-t border-slate-200 pt-8">
            <div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Expertise areas</span>
                <textarea
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="e.g., Climate science, economics, policy..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
                />
              </label>
            </div>

            {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p> : null}
            {successMsg ? <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-600">{successMsg}</p> : null}

            <button
              onClick={() => void handleUpdateProfile()}
              disabled={updating}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? "Updating..." : "Update profile"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Skills & competencies</h2>

          <div className="mt-6 space-y-4">
            {skills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{skill.name}</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{skill.score}/100</p>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skill.score}
                  onChange={(e) => void handleUpdateSkill(skill.name, Number(e.target.value))}
                  disabled={updating}
                  className="ml-4 h-2 w-24 cursor-pointer"
                />
              </div>
            ))}

            {skills.length === 0 && (
              <p className="text-center text-sm text-slate-500">No skills yet. Add your first skill below.</p>
            )}

            <div className="border-t border-slate-200 pt-4">
              <p className="font-semibold text-slate-900">Add a new skill</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill name"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newSkillScore}
                  onChange={(e) => setNewSkillScore(Number(e.target.value))}
                  className="w-24"
                />
                <button
                  onClick={() => void handleAddSkill()}
                  disabled={updating || !newSkillName.trim()}
                  className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
