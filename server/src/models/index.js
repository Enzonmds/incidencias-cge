import User from './User.js';
import Ticket from './Ticket.js';
import Message from './Message.js';

// Associations

// Users <-> Tickets
User.hasMany(Ticket, { foreignKey: 'created_by_user_id', as: 'createdTickets' });
Ticket.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'creator' });

User.hasMany(Ticket, { foreignKey: 'assigned_agent_id', as: 'assignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assigned_agent_id', as: 'assignee' });

// Tickets <-> Messages
Ticket.hasMany(Message, { foreignKey: 'ticket_id', as: 'messages' });
Message.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

// Users <-> Messages (Who sent the message)
User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id' });

export { User, Ticket, Message };
