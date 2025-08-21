import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoutes({ session, children }) {
  if (!session) {
    return <Navigate to="/" replace />
  }
  return children
}