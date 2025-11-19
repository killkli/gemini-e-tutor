import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { UserProfile } from '../types';

interface UserManagementProps {
  onUserSelect: (userId: string) => void;
  currentUser: string | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserSelect, currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(storageService.getUsers());
  };

  const handleCreateUser = () => {
    if (!newUserName.trim()) return;
    const newUser = storageService.createUser(newUserName.trim());
    setUsers(storageService.getUsers());
    setNewUserName('');
    setIsCreating(false);
    onUserSelect(newUser.id);
  };

  const handleDeleteUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除這位使用者嗎？所有相關記錄將會被清除。')) {
      storageService.deleteUser(userId);
      loadUsers();
      if (currentUser === userId) {
        onUserSelect(''); // Reset or handle no user
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <span>👥</span> 使用者管理
      </h3>

      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {users.map(user => (
          <div
            key={user.id}
            onClick={() => onUserSelect(user.id)}
            className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center group ${
              currentUser === user.id
                ? 'bg-amber-500/20 border-amber-500/50 border'
                : 'bg-white/5 border border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentUser === user.id ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}>
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className={`font-medium ${currentUser === user.id ? 'text-amber-400' : 'text-gray-200'}`}>
                  {user.name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => handleDeleteUser(e, user.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all duration-200"
              title="刪除使用者"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
            <p>尚無使用者</p>
            <p className="text-sm mt-1 opacity-60">請建立新的使用者檔案</p>
          </div>
        )}
      </div>

      {isCreating ? (
        <div className="animate-fade-in-up">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="輸入使用者名稱"
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-white placeholder-gray-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
            />
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
            >
              取消
            </button>
          </div>
          <button
            onClick={handleCreateUser}
            disabled={!newUserName.trim()}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-medium transition-all duration-200"
          >
            建立
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <span className="group-hover:scale-110 transition-transform duration-200 text-xl">+</span>
          <span>新增使用者</span>
        </button>
      )}
    </div>
  );
};

export default UserManagement;
