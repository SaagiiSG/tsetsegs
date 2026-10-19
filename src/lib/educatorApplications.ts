import { z } from 'zod';
export const educatorApplicationSchema = z.object({
 name:z.string().trim().min(2).max(100), institution:z.string().trim().min(2).max(150), email:z.string().trim().email().max(255), phone:z.string().trim().min(5).max(30).regex(/^[+0-9() -]+$/), country:z.string().trim().max(100), students:z.coerce.number().int().min(1).max(100000), message:z.string().trim().max(2000), website:z.string().max(0),
});
export const educatorWorkspaceReady = (approved:string|null,paid:string|null,status:string) => Boolean(approved && paid && status !== 'declined');
export const demoRole = (value:string|null):'student'|'teacher'|'admin' => value === 'teacher' || value === 'admin' ? value : 'student';
