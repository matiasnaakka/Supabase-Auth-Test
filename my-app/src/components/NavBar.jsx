import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const NavBar = ({ session, onSignOut }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleSignOutClick = (e) => {
    e.preventDefault()
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = () => {
    onSignOut()
    setShowLogoutConfirm(false)
  }

  const cancelSignOut = () => {
    setShowLogoutConfirm(false)
  }

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-black bg-opacity-80 fixed top-0 left-0 z-30">
      <Link to="/home" className="text-white font-['Lalezar'] text-2xl">Kohina</Link>
      <div className="flex-1 flex justify-center px-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="w-full max-w-md rounded-full px-4 py-2 bg-gray-900 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>
      {session && (
        <div className="flex items-center gap-4">
          <Link to="/home" className="text-white hover:underline">
            Home
          </Link>
          <Link to="/profile" className="text-white hover:underline">
            Profile
          </Link>
          <Link to="/upload" className="text-white hover:underline">
            Manage uploads
          </Link>
          <span className="text-white">{session.user.email}</span>
          <button
            onClick={handleSignOutClick}
            className="bg-green-500 text-black px-3 py-1 rounded hover:bg-gray-200"
          >
            Sign out
          </button>

          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black p-4 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold mb-2">Confirm Sign Out</h3>
                <p className="mb-4">Are you sure you want to sign out?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelSignOut}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSignOut}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

export default NavBar

