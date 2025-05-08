import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/pengLogo.png';
import '../styles/LandingPage.css';


const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <img src={logo} alt="Game Placeholder" className="landing-image" />
      <button className="play-button" onClick={() => navigate('/coinflip')}>
        Play Now
      </button>
    </div>
  );
};

export default LandingPage;
