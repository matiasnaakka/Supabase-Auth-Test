import React from 'react'
import { Link } from 'react-router-dom'

const NavBar = ({ session, onSignOut }) => (
  <nav className="w-full flex items-center justify-between px-6 py-4 bg-black bg-opacity-80 fixed top-0 left-0 z-30">
    <span className="text-white font-['Lalezar'] text-2xl">Kohina</span>
    {session && (
      <div className="flex items-center gap-4">
        <Link to="/profile" className="text-white hover:underline">
          Profile
        </Link>
        <span className="text-white">{session.user.email}</span>
        <button
          onClick={onSignOut}
          className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200"
        >
          Sign out
        </button>
      </div>
    )}
  </nav>
)

export default NavBar
