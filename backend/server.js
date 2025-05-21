const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Carrega locais do arquivo JSON (ou usa objeto direto)
const locais = require(path.join(__dirname, 'locais.json'));

// Lista todos os locais mapeados
app.get('/api/locais', (req, res) => {
  res.json(locais);
});

// Calcula a rota entre dois locais
// (substitui a função calcularRota)
app.post('/api/rota', (req, res) => {
  try {
    const { origem, destino } = req.body;
    
    const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const origemNormalizada = normalizar(origem);
    const destinoNormalizada = normalizar(destino);

    const coordOrigem = Object.entries(locais).find(
      ([key]) => normalizar(key) === origemNormalizada
    )?.[1];
    
    const coordDestino = Object.entries(locais).find(
      ([key]) => normalizar(key) === destinoNormalizada
    )?.[1];

    if (!coordOrigem || !coordDestino) {
      const sugestoes = {
        origem: Object.keys(locais).filter(k => normalizar(k).includes(origemNormalizada)),
        destino: Object.keys(locais).filter(k => normalizar(k).includes(destinoNormalizada))
      };
      return res.status(400).json({ 
        error: 'Local não encontrado',
        sugestoes
      });
    }

    const pontos = [];
    const steps = 20;
    const alturaMaxima = 0.0002;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lng = coordOrigem[1] + t * (coordDestino[1] - coordOrigem[1]);
      const latBase = coordOrigem[0] + t * (coordDestino[0] - coordOrigem[0]);
      const lat = latBase + alturaMaxima * Math.sin(Math.PI * t);
      pontos.push([lat, lng]);
    }

    res.json({
      pontos,
      origem: coordOrigem,
      destino: coordDestino
      // Removida a linha da distância
    });

  } catch (error) {
    console.error('Erro no cálculo da rota:', error);
    res.status(500).json({ 
      error: 'Erro interno no servidor',
      detalhes: error.message 
    });
  }
});

// Busca coordenadas (substitui getCoordinates)
app.get('/api/buscar-local', async (req, res) => {
  const { local } = req.query;
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(local)}+UniBH+Belo+Horizonte&limit=1`
    );
    const data = await response.json();
    res.json(data[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Erro na busca' });
  }
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

app.listen(3000, () => console.log('Backend rodando na porta 3000'));