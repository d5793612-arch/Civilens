export type Status = 'Pending' | 'In Progress' | 'Resolved'
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface Complaint {
  id: string
  issueType: string
  department: string
  status: Status
  severity: Severity
}
