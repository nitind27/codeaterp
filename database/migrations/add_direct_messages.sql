-- Add direct message support to discussion_channels
ALTER TABLE discussion_channels 
  MODIFY COLUMN type ENUM('project', 'department', 'general', 'direct') DEFAULT 'general';

-- Add dm_user_ids for quick lookup of DM participants
ALTER TABLE discussion_channels
  ADD COLUMN dm_user1_id INT NULL AFTER department,
  ADD COLUMN dm_user2_id INT NULL AFTER dm_user1_id,
  ADD UNIQUE KEY unique_dm (dm_user1_id, dm_user2_id),
  ADD FOREIGN KEY (dm_user1_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD FOREIGN KEY (dm_user2_id) REFERENCES users(id) ON DELETE CASCADE;
