import { describe,it,expect } from 'vitest';
import { demoRole,educatorApplicationSchema,educatorWorkspaceReady } from './educatorApplications';
describe('educator applications',()=>{
 it('requires approval',()=>expect(educatorWorkspaceReady(null,'2026-10-19','new')).toBe(false));
 it('requires payment',()=>expect(educatorWorkspaceReady('2026-10-19',null,'approved')).toBe(false));
 it('allows approved paid applications but blocks declined ones',()=>{expect(educatorWorkspaceReady('2026-10-19','2026-10-19','approved')).toBe(true);expect(educatorWorkspaceReady('2026-10-19','2026-10-19','declined')).toBe(false);});
 it('opens selected fictional role',()=>{expect(demoRole('admin')).toBe('admin');expect(demoRole('teacher')).toBe('teacher');expect(demoRole('bad')).toBe('student');});
 it('rejects invalid applications',()=>expect(educatorApplicationSchema.safeParse({name:'A',institution:'',email:'bad',phone:'<script>',country:'',students:0,message:'',website:''}).success).toBe(false));
});
