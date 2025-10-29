import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { apiService } from '../../services/api';
import { Search, Users, User } from 'lucide-react';

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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'direct' | 'group')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {!searching && users.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedUsers.some(u => u.user_id === user.user_id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback>
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.display_name || user.username}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No users found
              </div>
            )}
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="search">Add Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div>
                <Label>Selected Members ({selectedUsers.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full text-sm">
                      <span>{user.username}</span>
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="text-blue-600 hover:text-blue-800"
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {!searching && users.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-2">
                {users.map((user) => {
                  const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleUserSelect(user)}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} alt={user.username} />
                        <AvatarFallback>
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.display_name || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No users found
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={!canCreateChat() || loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Create Chat'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};