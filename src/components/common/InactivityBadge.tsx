import React from 'react';
import type { Client } from '../../types';
import { getClientInactivityAnalysis } from '../../services/inactivityService';
import { AlertCircle, Clock, CheckCircle2, UserCheck } from 'lucide-react';

interface Props {
  client: Client;
  showDetails?: boolean;
}

export const InactivityBadge: React.FC<Props> = ({ client, showDetails = false }) => {
  const analysis = getClientInactivityAnalysis(client);

  const getIcon = () => {
    switch (analysis.status) {
      case 'RECENTE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ATENCAO':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'INATIVO':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${analysis.badgeBgClass} ${analysis.badgeColorClass} ${analysis.badgeBorderClass}`}
        title={analysis.description}
      >
        {getIcon()}
        <span>{analysis.label}</span>
      </span>
      {showDetails && (
        <span className="text-[11px] text-slate-500 leading-tight">
          {analysis.description}
        </span>
      )}
    </div>
  );
};
