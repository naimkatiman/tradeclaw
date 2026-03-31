import type { BaseSkill, SkillMeta } from './base.js';
export declare class SkillLoader {
    private skillsDir;
    private loadedSkills;
    constructor(skillsDir: string);
    listSkills(): Promise<SkillMeta[]>;
    loadSkills(skillNames: string[]): Promise<BaseSkill[]>;
    private loadSkill;
    getLoadedSkills(): BaseSkill[];
    getSkill(name: string): BaseSkill | undefined;
}
//# sourceMappingURL=loader.d.ts.map