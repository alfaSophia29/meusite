
import React from 'react';
import { safeJsonStringify } from '../lib/utils';

const StubComponent = (props: any) => (
  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl m-4">
    <h2 className="text-2xl font-bold mb-4 text-blue-600 uppercase">{props.name || 'Componente'}</h2>
    <p className="text-gray-500">Este componente está em desenvolvimento ou foi temporariamente desativado.</p>
    <div className="mt-4 text-[10px] text-gray-400 font-mono overflow-auto max-h-40 text-left bg-gray-50 p-2 rounded">
      Props: {safeJsonStringify(props, 2)}
    </div>
  </div>
);

export default StubComponent;
