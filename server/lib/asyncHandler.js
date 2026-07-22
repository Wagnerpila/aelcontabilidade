// Express 4 não repassa rejeições de Promise dos handlers assíncronos para o
// error middleware sozinho — sem isso, qualquer erro (ex: violação de
// constraint no banco) derruba o processo Node inteiro. Este wrapper garante
// que todo erro assíncrono caia no error handler central em vez de crashar o servidor.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
