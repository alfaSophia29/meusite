
import React from 'react';
import { User } from '../types';

interface CreateGroupPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
}

const CreateGroupPage: React.FC<CreateGroupPageProps> = () => {
    return (
        <div className="p-10 text-center">
            <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">Criar Grupo</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Funcionalidade em desenvolvimento</p>
        </div>
    );
};

export default CreateGroupPage;
