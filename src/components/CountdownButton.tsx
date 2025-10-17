import React, { useState, useEffect } from 'react';
import CustomButton from "@/components/CustomButton";

const CountdownButton = ({ daysRemaining, expirationDate, handlePress } : any) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    if (daysRemaining <= 1 && expirationDate) {
      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const expiration = new Date(expirationDate).getTime();
        const difference = expiration - now;

        if (difference <= 0) {
          return 'Acceso pendiente';
        }

        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return `Próxima hipnosis en ${hours}h ${minutes}m ${seconds}s`;
      };

      setTimeLeft(calculateTimeLeft());
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [daysRemaining, expirationDate]);

  if (daysRemaining <= 1) {
    return (
      <CustomButton
        title={timeLeft}
        disabled={true}
        handlePress={() => {}}
        textStyles={{color: 'black'}}
        containerStyles={{opacity: 1, backgroundColor: '#808080'}}
      />
    );
  }

  return (
    <CustomButton
      title={`Próxima hipnosis en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`}
      disabled={true}
      handlePress={handlePress}
      textStyles={{color: 'black'}}
      containerStyles={{opacity: 1, backgroundColor: '#808080'}}

    />
  );
};

export default CountdownButton;