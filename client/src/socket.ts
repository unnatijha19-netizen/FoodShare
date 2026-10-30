
import { io } from 'socket.io-client';

const socket = io('http://https://foodshare-backend-jymm.onrender.com', {
  autoConnect: true,
  reconnection: true,
});

socket.on('connect', () => {
  console.log('FoodShare Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('FoodShare Socket disconnected');
});

export default socket;
