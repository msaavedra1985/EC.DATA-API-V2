'use strict';

/**
 * Migración: Crear tabla variables (Diccionario de Variables de Medición)
 * 
 * Define las variables disponibles para cada tipo de medición.
 * El campo 'column_name' (definicion) indica qué columna leer en Cassandra.
 * 
 * Ejemplos:
 * - Energía: column_name='e' → columna 'e' en 1m_t_datos
 * - Temperatura: column_name='val1' → columna 'val1' en sim1m_t_datos
 * - Potencia: column_name='p' → columna 'p' en 1m_t_datos
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear ENUM para tipo de gráfico
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE variable_chart_type AS ENUM (
          'column', 'spline', 'line', 'area', 'bar', 'pie', 'scatter', 'gauge', 'none'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Crear ENUM para tipo de agregación
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE variable_aggregation_type AS ENUM (
          'sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'none'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Crear tabla variables
    await queryInterface.createTable('variables', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID incremental - clave primaria'
      },
      measurement_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'measurement_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK a measurement_types - tipo de medición al que pertenece'
      },
      column_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Nombre de columna en Cassandra (ej: e, p, val1, val2)'
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Unidad de medida (ej: Wh, W, °C, %)'
      },
      chart_type: {
        type: 'variable_chart_type',
        allowNull: true,
        defaultValue: 'spline',
        comment: 'Tipo de gráfico recomendado para visualización'
      },
      axis_name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Nombre del eje para gráficos (ej: Energia (Wh))'
      },
      axis_id: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'ID del eje para agrupar variables en el mismo eje'
      },
      axis_min: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Valor mínimo del eje (null = auto)'
      },
      axis_function: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Función de agregación para tablas (total, avg, etc.)'
      },
      aggregation_type: {
        type: 'variable_aggregation_type',
        allowNull: true,
        defaultValue: 'none',
        comment: 'Tipo de agregación por defecto para esta variable'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización en listas y gráficos'
      },
      show_in_billing: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Mostrar en sección de facturación'
      },
      show_in_analysis: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Mostrar en sección de análisis'
      },
      is_realtime: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la variable soporta visualización en tiempo real'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la variable por defecto del tipo de medición'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la variable está activa'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice por measurement_type_id
    await queryInterface.addIndex('variables', ['measurement_type_id'], {
      name: 'variables_measurement_type_id_idx'
    });

    // Índice compuesto: measurement_type_id + column_name (no único - múltiples variables IoT usan misma columna)
    await queryInterface.addIndex('variables', ['measurement_type_id', 'column_name'], {
      name: 'variables_type_column_idx'
    });

    // Índice por is_active
    await queryInterface.addIndex('variables', ['is_active'], {
      name: 'variables_is_active_idx'
    });

    // Índice por display_order para ordenamiento
    await queryInterface.addIndex('variables', ['display_order'], {
      name: 'variables_display_order_idx'
    });

    console.log('✅ Tabla variables creada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('variables');
    
    // Eliminar ENUMs
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS variable_aggregation_type;
      DROP TYPE IF EXISTS variable_chart_type;
    `);

    console.log('✅ Tabla variables eliminada');
  }
};
