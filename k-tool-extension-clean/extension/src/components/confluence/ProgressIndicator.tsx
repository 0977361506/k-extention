import React from 'react';
import { ProgressStep } from '../../types/types';

interface ProgressIndicatorProps {
    steps: ProgressStep[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps }) => {
    const containerStyle: React.CSSProperties = {
        background: '#f7fafc',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        margin: '16px 0'
    };

    const stepsStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
    };

    const stepStyle = (status: string): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.3s ease',
        background: 
            status === 'completed' ? '#c6f6d5' :
            status === 'active' ? '#bee3f8' : '#f7fafc',
        color: 
            status === 'completed' ? '#22543d' :
            status === 'active' ? '#2a69ac' : '#718096'
    });

    return (
        <div style={containerStyle}>
            <div style={stepsStyle}>
                {steps.map((step, index) => (
                    <div key={index} style={stepStyle(step.status)}>
                        {step.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProgressIndicator;
