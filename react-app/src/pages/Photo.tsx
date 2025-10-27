import React from 'react';
import '../App.css';
import logo from '../logo.svg';

function Photo() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>
          Photo
        </h3>
      </header>
    </div>
  );
}

export default Photo;