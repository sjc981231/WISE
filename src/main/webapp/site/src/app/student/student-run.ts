import { Run } from '../domain/run';

export class StudentRun extends Run {
  periodName: string;
  studentsPerTeam: number;
  teacherFirstname: string;
  teacherLastname: string;
  workgroupId: number;
  workgroupMembers: any;
  workgroupNames: string;
  error: string;
  isHighlighted: boolean;
}
