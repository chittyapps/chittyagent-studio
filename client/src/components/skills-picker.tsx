import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Skill } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";
import { iconMap } from "@/lib/icons";
import { SKILL_CATEGORIES } from "@/lib/constants";

interface SkillsPickerProps {
  value: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillsPicker({ value, onChange }: SkillsPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const filtered = skills.filter((skill) => {
    const matchesSearch =
      !search ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || skill.category === category;
    return matchesSearch && matchesCategory;
  });

  const attachedSkills = skills.filter((s) => value.includes(s.id));

  const toggleSkill = (skillId: string) => {
    if (value.includes(skillId)) {
      onChange(value.filter((id) => id !== skillId));
    } else {
      onChange([...value, skillId]);
    }
  };

  return (
    <div className="space-y-4">
      {attachedSkills.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="text-sm font-medium mb-2">
            {attachedSkills.length} skill{attachedSkills.length !== 1 ? "s" : ""} attached
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachedSkills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="text-xs">
                {skill.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              category === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((skill) => {
          const isAttached = value.includes(skill.id);
          const Icon = iconMap[skill.icon] || iconMap["puzzle"];
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                isAttached
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: skill.color + "18",
                  color: skill.color,
                }}
              >
                {Icon ? <Icon className="w-4 h-4" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{skill.name}</span>
                  {isAttached && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {skill.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {skill.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {skill.installCount} installs
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No skills found matching your criteria.
        </p>
      )}
    </div>
  );
}
