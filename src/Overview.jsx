import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from './TopNav';

const Overview = () => {
  const navigate = useNavigate();

  const Card = ({ title, description, to }) => (
    <button
      onClick={() => navigate(to)}
      className="w-full text-left rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="text-lg font-semibold text-gray-900">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{description}</div>
      <div className="mt-4 text-sm font-medium text-red-700">Openen →</div>
    </button>
  );

  return (
    <div className="min-h-screen brand-page">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Overzicht</h1>
        <p className="mt-2 text-sm text-gray-600">
          Beheer van acceptatieregels, dynamiekregels en productdefinities
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Acceptatieregels"
            description="Overzicht van acceptatieregels, zoeken/sorteren, aanmaken, wijzigen en verwijderen"
            to="/acceptatieregels"
          />
          <Card
            title="Dynamiekregels"
            description="Overzicht van dynamiekregels, zoeken/sorteren, aanmaken, wijzigen en verwijderen"
            to="/dynamiekregels"
          />
          <Card
            title="Producten"
            description="Overzicht van actieve producten met bijbehorende acceptatie- en dynamiekregels"
            to="/producten"
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;
