import React from "react";
import Title from "../components/Title";
import AgentControlTower from "../components/AgentControlTower";

const AgentTower = () => {
    return (
        <div className='w-full relative h-[calc(100vh-120px)]'>
            <div className='flex items-center justify-between mb-8' style={{ marginBottom: '40px' }}>
                <Title title="Agent Control Tower" />
            </div>

            <div className="w-full h-full pb-10">
                <AgentControlTower />
            </div>
        </div>
    );
};

export default AgentTower;
