import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);
