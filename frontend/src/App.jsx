import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PhoneFrame from './components/PhoneFrame';
import Register from './screens/Register';
import Feed from './screens/Feed';
import Chat from './screens/Chat';

export default function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Feed />} />
        <Route path="/chat/:matchId" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PhoneFrame>
  );
}
