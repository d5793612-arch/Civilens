import { Route, Routes } from 'react-router-dom'
import { OfficerDetail } from './OfficerDetail'
import { OfficerHome } from './OfficerHome'
import { OfficerLayout } from './OfficerLayout'

export function OfficerShell() {
  return (
    <Routes>
      <Route element={<OfficerLayout />}>
        <Route index element={<OfficerHome />} />
        <Route path=":complaintId" element={<OfficerDetail />} />
      </Route>
    </Routes>
  )
}
