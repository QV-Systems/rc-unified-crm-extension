import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import LogModal from './components/log/logModal';
import { RcThemeProvider } from '@ringcentral/juno';

function App() {
    return (
        <RcThemeProvider>
            <LogModal />
        </RcThemeProvider>
    )
}
const container = document.getElementById('react-container');
ReactDOM.render(<App />, container);