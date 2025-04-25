/* src/app/dashboard/components/widgets/TicketForm.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TicketFormProps } from '../../../types';
import { z } from 'zod';

const TicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['Alta', 'Media', 'Baja']),
});

export default function TicketForm({ onSubmit }: TicketFormProps) {
  const [ticket, setTicket] = useState({
    title: '',
    description: '',
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    try {
      const validated = TicketSchema.parse(ticket);
      onSubmit({ ...validated, status: 'Abierto' });
      setTicket({ title: '', description: '', priority: 'Media' });
      setError('');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors.map((e) => e.message).join(', '));
      } else {
        setError('Failed to submit ticket');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Create Support Ticket</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={ticket.title}
          onChange={(e) => setTicket({ ...ticket, title: e.target.value })}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full"
        />
        <textarea
          placeholder="Description"
          value={ticket.description}
          onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full"
          rows={4}
        />
        <select
          value={ticket.priority}
          onChange={(e) => setTicket({ ...ticket, priority: e.target.value as 'Alta' | 'Media' | 'Baja' })}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full"
        >
          <option value="Alta">Alta</option>
          <option value="Media">Media</option>
          <option value="Baja">Baja</option>
        </select>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleSubmit}
          className="bg-[#8B0000] text-white px-4 py-2 rounded"
        >
          Submit Ticket
        </motion.button>
      </div>
    </motion.div>
  );
}