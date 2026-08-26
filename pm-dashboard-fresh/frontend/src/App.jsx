import React, { useEffect, useState } from 'react';
import PMDashboard from './components/PMDashboard';
import Chatbot from './components/Chatbot';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    const theme = savedTheme === 'dark' ? 'dark' : 'light';

    document.documentElement.classList.remove('dark-theme', 'light-theme');
    document.documentElement.classList.add(`${theme}-theme`);
  }, []);

  const updateUserContext = (user) => {
    setCurrentUser(user);
  };

  const updateProjectContext = (project) => {
    setCurrentProject(project);
  };

  return (
    <>
      <PMDashboard 
        onUserChange={updateUserContext}
        onProjectChange={updateProjectContext}
      />
      <Chatbot 
        currentUser={currentUser}
        currentProject={currentProject}
      />
    </>
  );
}

export default App;