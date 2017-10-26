const RISK = ['BAIXISSIMO RISCO', 'BAIXO', 'MEDIO', 'ALTO', 'ALTISSIMO'];
import arrayToSentence from 'array-to-sentence';
import _ from 'underscore';
let qtdEnd = 0;
let ehPep = false;

export class CognitiveDossier {

    /*
     * O Parser é o primeiro filtro de dados, ele captura todas as requisições do dossiê,
     * aqui dentro todas as informações são compreendidas
     */
     constructor(parser) {
       this.parser = parser;
       this.phrase = [];
       this.phrases = [];

       this.parsers = {
         "SELECT FROM 'CBUSCA'.'HOMONYMOUS'": 'homonymous',
         "SELECT FROM 'KRONOOS'.'GEOCODE'": 'endereco',
         "SELECT FROM 'RFB'.'CERTIDAO'": 'rfb',
         "SELECT FROM 'KRONOOS'.'ELEICOES'": 'pep',
       };
    }

    getFirstPhrase() {
        this.phrase[0] = this.phrase[0] || [];
        return this.phrase[0];
    }
    getSecondPhrase() {
        this.phrase[1] = this.phrase[1] || [];
        return this.phrase[1];
    }
    getThirdPhrase() {
        this.phrase[2] = this.phrase[2] || [];
        return this.phrase[2];
    }
    getFourthPhrase() {
        this.phrase[3] = this.phrase[3] || [];
        return this.phrase[3];
    }

    generateFirstPhrase() {
      this.getFirstPhrase().push(this.parser.name);
      this.getFirstPhrase().push((moment().years()) - (moment(this.parser.nascimento, "DD/MM/YYYY").years()) + ' anos');
      this.getFirstPhrase().push(`é pessoa física inscrita no CPF/MF ${this.parser.cpf_cnpj}`);

      this.empregador();
      return this.phrase.map(x => arrayToSentence(x, {lastSeparator: ', '})).join(". ");

    }

    generateSecondPhrase() {
      if (this.parser.informationQA().hasNotation) {
          let length = _.reduce(_.values(this.parser.informationQA().hasNotation), (x, y) => x + y, 0)
          if (length === 1) {
              this.getSecondPhrase().push(`\nEm relação à situação jurídica consta 1 apontamento cadastral no sistema Kronoos`);
          } else {
              this.getSecondPhrase().push(`\nEm relação à situação jurídica constam ${length} apontamentos cadastrais no sistema Kronoos`);
          }
      } else {
          this.getSecondPhrase().push(`\nEm relação à situação jurídica não constam apontamentos cadastrais no sistema Kronoos`);
      }

      return this.phrase.map(x => arrayToSentence(x, {lastSeparator: ' e '}));

    }

    generateThirdPhrase() {
      let xml = this.parser.ccbuscaData;
      let qtdEmpresas = $("BPQL > body > parsocietaria > empresa", xml);
      if(qtdEmpresas.length > 0) {
        this.getThirdPhrase().push(`\n${this.parser.name} possui relações societárias com ${qtdEmpresas.length} pessoa(s) jurídica(s)`);
      }
      for (let response of this.parser.responses) {
          if (!this.parsers[response.query])
              continue;
          this[this.parsers[response.query]](response);
      }
      return this.phrase.map(x => arrayToSentence(x, {lastSeparator: ' e '})).join(".");

    }

    generateParagraph() {
        this.generateFirstPhrase();
        this.generateSecondPhrase();
        let c = this.generateThirdPhrase();
        qtdEnd = 0;
        ehPep = false;

        return c;
    }

    endereco (serverCall) {
        if(qtdEnd++ === 0 && serverCall.response.status !== "ZERO_RESULTS") {
          this.getFirstPhrase().push(`reside ou residiu em ${serverCall.response.results[0].formatted_address}`);
        }
    }

    empregador() {
      let texto = this.parser.appendElement.text();
      let textoEmpregadores = texto.split("Empregadores");
      let ultimoEmprego;
      let cargo;
      let salario;
      let tempo;

      if(textoEmpregadores[1]) {
        let empregos = textoEmpregadores[1].split(/s\./);

        if(empregos[1].indexOf("Não") === -1) {
          ultimoEmprego = empregos[1].split("-");
          cargo = ultimoEmprego[1].split("De");
        }else{
          ultimoEmprego = empregos[0].split("-");
          cargo = ultimoEmprego[2].split("De");
        }
        salario = cargo[1].split(",");
        tempo = salario[1] + "s";
        this.getFirstPhrase().push(`${cargo[0]} em ${ultimoEmprego[0]} possui renda de ${salario[0]}`);
      }
    }

    rfb(serverCall) {
        let situacaoCadastral = $("BPQL > body > RFB > situacao", serverCall.response).text();
        if(situacaoCadastral !== "") {
          if(!ehPep) {
            this.getThirdPhrase().push(` Encontra-se em situação ${situacaoCadastral} junto à Receita Federal.`);
          }else{
            this.getThirdPhrase().push(`${this.parser.name} encontra-se em situação ${situacaoCadastral} junto à Receita Federal.`);
          }

        }
    }

    homonymous(serverCall) {
        /* JSON */
        return `existem ${serverCall.response.homonymous} homônimos no país`;
    }

    pep(serverCall) {
      let eleicao = serverCall.response;

      if(eleicao.length !== 0) {
        ehPep = true;
        let valoresEleicao = _.values(eleicao);
        let ocupacoes = [];
        let anos = [];
        let anosEleitos = [];

        for (let dado of valoresEleicao) {
          ocupacoes.push(dado.DESCRICAO_CARGO);
          anos.push(dado.ANO_ELEICAO);
          if(dado.DESC_SIT_TOT_TURNO === "ELEITO") {
            anosEleitos.push(dado.ANO_ELEICAO);
          }
        }

        let stringOcupacoes = arrayToSentence(ocupacoes, {lastSeparator: ' e '});
        let stringAnos = arrayToSentence(anos, {lastSeparator: ' e '});
        let stringAnosEleitos = arrayToSentence(anosEleitos, {lastSeparator: ' e '});

        if(anos.length > 1) {
          if(stringAnosEleitos.length >= 1) {
            this.getFourthPhrase().push(`\nSegundo a base de dados do COAF, ${this.parser.name} é uma PEP (Pessoa Politicamente Exposta) e concorreu aos cargos de ${stringOcupacoes} nos anos ${stringAnos} respectivamente. Sendo eleito no(s) ano(s) ${stringAnosEleitos}`);
          }else{
            this.getFourthPhrase().push(`\nSegundo a base de dados do COAF, ${this.parser.name} é uma PEP (Pessoa Politicamente Exposta) e concorreu aos cargos de ${stringOcupacoes} nos anos ${stringAnos} respectivamente.`);
          }

        }else{
          if(stringAnosEleitos.length >= 1) {
            this.getFourthPhrase().push(`\nSegundo a base de dados do COAF, ${this.parser.name} é uma PEP (Pessoa Politicamente Exposta), e concorreu ao cargo de ${stringOcupacoes} no ano ${stringAnos}. Sendo eleito no(s) ano(s) ${stringAnosEleitos}`);
          }else{
            this.getFourthPhrase().push(`\nSegundo a base de dados do COAF, ${this.parser.name} é uma PEP (Pessoa Politicamente Exposta), e concorreu ao cargo de ${stringOcupacoes} no ano ${stringAnos}.`);
          }
        }
      }

    }

    recuperaPessoaFisica(callback) {
        if (!this.parser.cpf) return;
        this.parser.serverCall("SELECT FROM 'RECUPERA'.'LocalizadorPerfilSocioDemograficoPF'", {
            data: {
                documento: this.parser.cpf
            },
            success: data => {
                let riskText = $("SCORE_RISCO", data).text();
                let risk = RISK.indexOf(riskText);
                let text = $("DESCRICAO_CLUSTER", data).text();
                if (risk === -1 || !text) return;
                callback("Risco de Crédito", (risk * 0.25), text);
            }
        });
    }

    generateOutput(callback) {
      let paragraph = this.generateParagraph();

      callback("Risco de Crédito", 0.01, paragraph);
      this.recuperaPessoaFisica(callback);
      this.parser.controller.trigger("kronoos::cognitiveDossier", [callback, this]);
    }

}

/* https://www.letras.mus.br/the-naked-and-famous/1701151/traducao.html */
