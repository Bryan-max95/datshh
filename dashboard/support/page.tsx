/* src/app/dashboard/support/page.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import TicketForm from '../components/widgets/TicketForm';
import { useSession } from 'next-auth/react';
import { Ticket } from '../../types';

export default function SupportPage() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async (ticket: Omit<Ticket, '_id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticket, createdAt: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Failed to submit ticket');
      const newTicket = await response.json();
      setTickets([...tickets, newTicket]);
      setError('');
    } catch (err) {
      setError('Failed to submit ticket');
      console.error('Error submitting ticket:', err);
    }
  };

  if (status === 'loading') {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to continue.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Support</h1>
      {error && <p className="text-red-500">{error}</p>}
      <TicketForm onSubmit={handleSubmit} />
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Submitted Tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-gray-400">No tickets submitted.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td>{ticket.title}</td>
                    <td>
                      <span
                        className={
                          ticket.priority === 'Alta'
                            ? 'text-red-500'
                            : ticket.priority === 'Media'
                            ? 'text-yellow-500'
                            : 'text-green-500'
                        }
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td>{ticket.status}</td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}