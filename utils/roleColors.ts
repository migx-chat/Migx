
export const roleColors = {
  creator: '#FFD700',   // kuning untuk creator/owner
  admin: '#FF8C00',     // orange untuk admin
  moderator: '#FFD93D', // kuning untuk moderator
  merchant: '#F44336',  // merah untuk merchant
  customer_service: '#FF8C00', // orange untuk customer service
  cs: '#FF8C00',        // orange untuk cs (alias)
  normal: '#4BA3FF',    // biru untuk user normal
  system: '#FF8C00',    // orange untuk system
  own: '#2d7a4f',       // hijau tua untuk pesan sendiri
  mentor: '#F44336',    // merah untuk mentor
};

export type UserRole = keyof typeof roleColors;
