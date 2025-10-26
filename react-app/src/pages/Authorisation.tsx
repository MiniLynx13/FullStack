import React from 'react';
import '../App.css';
import logo from '../logo.svg';
import { usePagePhrase } from '../hooks/usePagePhrase';

function Authorisation() {
  const { phrase, loading, error } = usePagePhrase('authorisation');

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>
          Authorisation
        </h3>
        <p>
          {loading && 'Загрузка...'}
          {error && <span style={{ color: 'red' }}>{error}</span>}
          {!loading && !error && phrase}
		    </p>
      </header>
    </div>
  );
}

export default Authorisation;