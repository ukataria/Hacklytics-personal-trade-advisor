// charts.js
import React from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const ClusterPieCharts = ({ clusterData }) => {
  const { Duration_mean, Profit_count } = clusterData;

  const durationData = {
    labels: Object.keys(Duration_mean).map(cluster => `Cluster ${cluster}`),
    datasets: [
      {
        data: Object.values(Duration_mean),
        backgroundColor: ['#FF6384', '#36A2EB'],
      },
    ],
  };

  const profitData = {
    labels: Object.keys(Profit_count).map(cluster => `Cluster ${cluster}`),
    datasets: [
      {
        data: Object.values(Profit_count),
        backgroundColor: ['#FFCE56', '#4BC0C0'],
      },
    ],
  };

  return (
    <div>
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-2">Duration Mean Pie Chart</h4>
        <Pie data={durationData} />
      </div>
      <div>
        <h4 className="text-md font-semibold mb-2">Profit Count Pie Chart</h4>
        <Pie data={profitData} />
      </div>
    </div>
  );
};

export default ClusterPieCharts;
