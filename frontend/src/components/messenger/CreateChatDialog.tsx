import React, { useState, useEffect, useCallback } from 'react';
import { BootstrapDialog, BootstrapDialogContent, BootstrapDialogHeader, BootstrapDialogTitle } from '../ui/bootstrap-dialog';
import { BootstrapButton } from '../ui/bootstrap-button';
import { BootstrapInput } from '../ui/bootstrap-input';
import { BootstrapLabel } from '../ui/bootstrap-label';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapCheckbox } from '../ui/bootstrap-checkbox';
import { BootstrapTabs, BootstrapTabsList, BootstrapTabsTrigger, BootstrapTabsContent } from '../ui/bootstrap-tabs';
import { apiService } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUsers, faUser } from '@fortawesome/free-solid-svg-icons';

interface User {
  user_id: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
}

interface CreateChatDialogProps {
  onClose: () => void;
  onChatCreated: () => void;
}

export const CreateChatDialog: React.FC<CreateChatDialogProps> = ({
  onClose,
  onChatCreated
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUsers = useCallback(async () => {
    try {
      setSearching(true);
      const response = await apiService.searchUsers(searchQuery);
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, searchUsers]);

  const handleUserSelect = (user: User) => {
    if (activeTab === 'direct') {
      // For direct chats, only allow one user selection
      setSelectedUsers([user]);
    } else {
      // For group chats, allow multiple selections
      setSelectedUsers(prev =>
        prev.some(u => u.user_id === user.user_id)
          ? prev.filter(u => u.user_id !== user.user_id)
          : [...prev, user]
      );
    }
  };

  const handleCreateChat = async () => {
    try {
      setLoading(true);

      if (activeTab === 'direct' && selectedUsers.length === 1) {
        await apiService.createDirectChat(selectedUsers[0].user_id);
      } else if (activeTab === 'group' && selectedUsers.length >= 2 && groupName.trim()) {
        await apiService.createGroupChat({
          name: groupName.trim(),
          participantIds: selectedUsers.map(u => u.user_id)
        });
      } else {
        return; // Invalid state
      }

      onChatCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const canCreateChat = () => {
    if (activeTab === 'direct') {
      return selectedUsers.length === 1;
    } else {
      return selectedUsers.length >= 2 && groupName.trim().length > 0;
    }
  };

  return (
    <BootstrapDialog open={true} onOpenChange={onClose}>
      <BootstrapDialogHeader>
        <BootstrapDialogTitle>Create New Chat</BootstrapDialogTitle>
      </BootstrapDialogHeader>
      <BootstrapDialogContent>
        <BootstrapTabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'direct' | 'group')}>
          <BootstrapTabsList className="mb-4">
            <BootstrapTabsTrigger value="direct" className="d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faUser} />
              Direct
            </BootstrapTabsTrigger>
            <BootstrapTabsTrigger value="group" className="d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faUsers} />
              Group
            </BootstrapTabsTrigger>
          </BootstrapTabsList>

          <BootstrapTabsContent value="direct" className="space-y-4">
            <div>
              <BootstrapLabel htmlFor="search">Search Users</BootstrapLabel>
              <div className="position-relative">
                <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <BootstrapInput
                  id="search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-5"
                />
              </div>
            </div>

            {searching && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!searching && users.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className={`d-flex align-items-center space-x-3 p-2 rounded-lg cursor-pointer hover-bg-light ${selectedUsers.some(u => u.user_id === user.user_id) ? 'bg-primary bg-opacity-10 border border-primary' : ''}`}
                    onClick={() => handleUserSelect(user)}
                    style={{ cursor: 'pointer' }}
                  >
                    <BootstrapAvatar src={user.avatar_url} alt={user.username} size="sm">
                      {user.username.substring(0, 2).toUpperCase()}
                    </BootstrapAvatar>
                    <div className="flex-1 ms-3">
                      <p className="mb-0 fw-medium text-dark">{user.display_name || user.username}</p>
                      <p className="mb-0 small text-muted">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <div className="text-center py-4 text-muted">
                No users found
              </div>
            )}
          </BootstrapTabsContent>

          <BootstrapTabsContent value="group" className="space-y-4">
            <BootstrapInput
              label="Group Name"
              id="groupName"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            <div>
              <BootstrapLabel htmlFor="search">Add Members</BootstrapLabel>
              <div className="position-relative">
                <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <BootstrapInput
                  id="search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-5"
                />
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div>
                <BootstrapLabel>Selected Members ({selectedUsers.length})</BootstrapLabel>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <div key={user.user_id} className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-2 py-1 rounded-pill small">
                      <span>{user.username}</span>
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="btn btn-sm btn-outline-primary border-0 p-0 ms-1"
                        style={{ fontSize: '12px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searching && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!searching && users.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-2">
                {users.map((user) => {
                  const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                  return (
                    <div
                      key={user.user_id}
                      className="d-flex align-items-center space-x-3 p-2 rounded-lg cursor-pointer hover-bg-light"
                      onClick={() => handleUserSelect(user)}
                      style={{ cursor: 'pointer' }}
                    >
                      <BootstrapCheckbox checked={isSelected} />
                      <BootstrapAvatar src={user.avatar_url} alt={user.username} size="sm">
                        {user.username.substring(0, 2).toUpperCase()}
                      </BootstrapAvatar>
                      <div className="flex-1 ms-3">
                        <p className="mb-0 fw-medium text-dark">{user.display_name || user.username}</p>
                        <p className="mb-0 small text-muted">@{user.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <div className="text-center py-4 text-muted">
                No users found
              </div>
            )}
          </BootstrapTabsContent>
        </BootstrapTabs>

        <div className="d-flex justify-content-end gap-2 pt-4">
          <BootstrapButton variant="outline-secondary" onClick={onClose}>
            Cancel
          </BootstrapButton>
          <BootstrapButton
            variant="primary"
            onClick={handleCreateChat}
            disabled={!canCreateChat() || loading}
          >
            {loading ? (
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : null}
            Create Chat
          </BootstrapButton>
        </div>
      </BootstrapDialogContent>
    </BootstrapDialog>
  );
};